'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');
const tinycolor = require("tinycolor2");

class ShellyRGBW2ColorDevice extends Homey.Device {

  onInit() {
    this.pollDevice();
    this.setAvailable();

    // ADD MISSING CAPABILITIES
    if (!this.hasCapability('light_mode')) {
      this.addCapability('light_mode');
    }
    if (!this.hasCapability('onoff.whitemode')) {
      this.addCapability('onoff.whitemode');
    }

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
      let white = Number(this.denormalize(value, 0, 255));
      this.setCapabilityValue("light_mode", 'temperature');
      return util.sendCommand('/color/0?white='+ white, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerMultipleCapabilityListener(['light_hue', 'light_saturation' ], ( valueObj, optsObj ) => {
      if (typeof valueObj.light_hue !== 'undefined') {
        var hue_value = valueObj.light_hue;
      } else {
        var hue_value = this.getCapabilityValue('light_hue');
      }
      if (typeof valueObj.light_saturation !== 'undefined') {
        var saturation_value = valueObj.light_saturation;
      } else {
        var saturation_value = this.getCapabilityValue('light_saturation');
      }
      let color = tinycolor.fromRatio({ h: hue_value, s: saturation_value, v: this.getCapabilityValue('dim') });
      let rgbcolor = color.toRgb();
      this.setCapabilityValue("light_mode", 'color');
      return util.sendCommand('/color/0?red='+ Number(rgbcolor.r) +'&green='+ Number(rgbcolor.g) +'&blue='+ Number(rgbcolor.b) +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    }, 500);

    this.registerCapabilityListener('onoff.whitemode', (value, opts) => {
      if (value) {
        this.setCapabilityValue("light_mode", 'temperature');
        return util.sendCommand('/color/0?gain=0&white=255', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        this.setCapabilityValue("light_mode", 'color');
        return util.sendCommand('/color/0?gain=100&white=0', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

  }

  onDeleted() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);
  }

  // HELPER FUNCTIONS
  pollDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(() => {
      util.sendCommand('/color/0', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          clearTimeout(this.offlineTimeout);

          let state = result.ison;
          let dim = result.gain / 100;
          let white = 1 - Number(this.normalize(result.white, 0, 255));
          let color = tinycolor({ r: result.red, g: result.green, b: result.blue });
          let hsv = color.toHsv();
          let hue = Number((hsv.h / 360).toFixed(2));

          // capability onoff
          if (state != this.getCapabilityValue('onoff')) {
            this.setCapabilityValue('onoff', state);
          }

          // capability dim
          if (dim != this.getCapabilityValue('dim')) {
            this.setCapabilityValue('dim', dim);
          }

          // capability light_temperature
          if (white != this.getCapabilityValue('light_temperature')) {
            this.setCapabilityValue('light_temperature', white);
          }

          // capability light_hue
          if (hue != this.getCapabilityValue('light_hue')) {
            this.setCapabilityValue('light_hue', hue);
          }

          // capability light_saturation
          if (hsv.s != this.getCapabilityValue('light_saturation')) {
            this.setCapabilityValue('light_saturation', hsv.s);
          }

          // capability measure_power
          if (result.power != this.getCapabilityValue('measure_power')) {
            this.setCapabilityValue('measure_power', result.power);
          }

          //capability light_mode
          if (Number(result.white) > 220 && !this.getCapabilityValue('onoff.whitemode')) {
            this.setCapabilityValue('onoff.whitemode', true);
          }
          if (Number(result.gain) > 10 && Number(result.white) <= 220 && this.getCapabilityValue('onoff.whitemode')) {
            this.setCapabilityValue('onoff.whitemode', false);
          }

        })
        .catch(error => {
          this.log(error);
          this.setUnavailable(Homey.__('Unreachable'));
          this.pingDevice();

          this.offlineTimeout = setTimeout(() => {
            let offlineTrigger = new Homey.FlowCardTrigger('triggerDeviceOffline');
            offlineTrigger.register().trigger({"device": this.getName(), "device_error": error.toString() });
            return;
          }, 60000 * this.getSetting('offline'));
        })
    }, 1000 * this.getSetting('polling'));
  }

  pingDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          this.setAvailable();
          this.pollDevice();
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

module.exports = ShellyRGBW2ColorDevice;
