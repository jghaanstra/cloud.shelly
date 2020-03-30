'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class ShellyDuoDevice extends Homey.Device {

  onInit() {
    new Homey.FlowCardTriggerDevice('triggerBtnAction').register();

    var interval = this.getSetting('polling') || 5;
    this.pollDevice(interval);
    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', (value, opts) => {
      if (value) {
        return util.sendCommand('/light/0?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return util.sendCommand('/light/0?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

    this.registerCapabilityListener('dim', (value, opts) => {
      var dim = value * 100;
      return util.sendCommand('/light/0?brightness='+ dim +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('light_temperature', (value, opts) => {
      let white = 100 - (value * 100);
      return util.sendCommand('/light/0?white='+ white +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.triggers', async () => {
      var homeyip = await util.getHomeyIp();
      var out_on_url = '/settings/light/0?out_on_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyduo/'+ this.getData().id +'/out_on/';
      var out_off_url = '/settings/light/0?out_off_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyduo/'+ this.getData().id +'/out_off/';

      try {
        await util.sendCommand(out_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(out_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return;
      } catch (error) {
        throw new Error(error);
      }
    });

    this.registerCapabilityListener('button.removetriggers', async () => {
      var out_on_url = '/settings/light/0?out_on_url=null';
      var out_off_url = '/settings/light/0?out_off_url=null';

      try {
        await util.sendCommand(out_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(out_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return;
      } catch (error) {
        throw new Error(error);
      }
    });

  }

  onDeleted() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);
  }

  // HELPER FUNCTIONS
  pollDevice(interval) {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          let state = result.lights[0].ison;
          let dim = result.lights[0].brightness / 100;
          let light_temperature = 1 - (result.lights[0].white / 100);
          let measure_power = result.meters[0].power;
          let meter_power = result.meters[0].total * 0.000017;

          // capability onoff
          if (state != this.getCapabilityValue('onoff')) {
            this.setCapabilityValue('onoff', state);
          }

          // capability dim
          if (dim != this.getCapabilityValue('dim')) {
            this.setCapabilityValue('dim', dim);
          }

          // capability light_temperature
          if (light_temperature != this.getCapabilityValue('light_temperature')) {
            this.setCapabilityValue('light_temperature', light_temperature);
          }

          // capability measure_power
          if (measure_power != this.getCapabilityValue('measure_power')) {
            this.setCapabilityValue('measure_power', measure_power);
          }

          // capability measure_power
          if (meter_power != this.getCapabilityValue('meter_power')) {
            this.setCapabilityValue('meter_power', meter_power);
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

}

module.exports = ShellyDuoDevice;
