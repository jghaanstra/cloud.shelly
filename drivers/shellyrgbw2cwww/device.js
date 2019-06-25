'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');
const tinycolor = require("tinycolor2");

class ShellyRGBW2CWWWDevice extends Homey.Device {

  onInit() {
    var interval = this.getSetting('polling') || 5;
    this.pollDevice(interval);

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', (value, opts) => {
      if (value) {
        return util.sendCommand('/color/0?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return util.sendCommand('/color/0?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

    this.registerCapabilityListener('dim', (value, opts) => {
      var dim = value * 100;
      return util.sendCommand('/color/0?gain='+ dim +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('light_temperature', (value, opts) => {
      let red = Number(this.denormalize(value, 0, 255));
      let blue = red;
      let green = 255 - red;
      let white = green;
      return util.sendCommand('/color/0?red='+ red +'&green='+ green +'&blue='+ blue +'&white='+ white +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  onDeleted() {
    clearInterval(this.pollingInterval);
  }

  // HELPER FUNCTIONS
  pollDevice(interval) {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(() => {
      util.sendCommand('/color/0', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          let state = result.ison;
          let dim = result.gain / 100;
          let temperature = 1 - Number(this.normalize(result.white, 0, 255));

          // capability onoff
          if (state != this.getCapabilityValue('onoff')) {
            this.setCapabilityValue('onoff', state);
          }

          // capability dim
          if (dim != this.getCapabilityValue('dim')) {
            this.setCapabilityValue('dim', dim);
          }

          // capability light_temperature
          if (temperature != this.getCapabilityValue('light_temperature')) {
            this.setCapabilityValue('light_temperature', temperature);
          }

          // capability measure_power
          if (result.power != this.getCapabilityValue('measure_power')) {
            this.setCapabilityValue('measure_power', result.power);
          }

        })
        .catch(error => {
          this.log(error);
          this.setUnavailable(Homey.__('Unreachable'));
          this.pingDevice();
        })
    }, 1000 * interval);
  }

  pingDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          this.setAvailable();
          var interval = this.getSetting('polling') || 5;
          this.pollDevice(interval);
        })
        .catch(error => {
          this.log('Device is not reachable, pinging every 63 seconds to see if it comes online again.');
        })
    }, 63000);
  }

  normalize(value, min, max) {
  	var normalized = (value - min) / (max - min);
  	return Number(normalized.toFixed(2));
  }

  denormalize(normalized, min, max) {
  	var denormalized = ((1 - normalized) * (max - min) + min);
  	return Number(denormalized.toFixed(0));
  }

}

module.exports = ShellyRGBW2CWWWDevice;
