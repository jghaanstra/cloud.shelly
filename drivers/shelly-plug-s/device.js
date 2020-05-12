'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class ShellyPlugSDevice extends Homey.Device {

  onInit() {
    new Homey.FlowCardTriggerDevice('triggerCallbackEvents').register();

    var interval = this.getSetting('polling') || 5;
    this.pollDevice(interval);
    this.setAvailable();

    // ADD MISSING CAPABILITIES
    if (this.hasCapability('button.triggers')) {
      this.removeCapability('button.triggers');
    }
    if (this.hasCapability('button.removetriggers')) {
      this.removeCapability('button.removetriggers');
    }
    if (!this.hasCapability('button.callbackevents')) {
      this.addCapability('button.callbackevents');
    }
    if (!this.hasCapability('button.removecallbackevents')) {
      this.addCapability('button.removecallbackevents');
    }

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', (value, opts) => {
      if (value) {
        return util.sendCommand('/relay/0?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return util.sendCommand('/relay/0?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

    this.registerCapabilityListener('button.callbackevents', async () => {
      var homeyip = await util.getHomeyIp();
      var btn_on_url = '/settings/relay/0?btn_on_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shelly-plug-s/'+ this.getData().id +'/btn_on/';
      var out_on_url = '/settings/relay/0?out_on_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shelly-plug-s/'+ this.getData().id +'/out_on/';
      var out_off_url = '/settings/relay/0?out_off_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shelly-plug-s/'+ this.getData().id +'/out_off/';

      try {
        await util.sendCommand(btn_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(out_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(out_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand('/reboot', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return;
      } catch (error) {
        throw new Error(error);
      }
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      var btn_on_url = '/settings/relay/0?btn_on_url=null';
      var out_on_url = '/settings/relay/0?out_on_url=null';
      var out_off_url = '/settings/relay/0?out_off_url=null';

      try {
        await util.sendCommand(btn_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
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
          let state = result.relays[0].ison;
          let power = result.meters[0].power;
          let total_consumption = result.meters[0].total;
          let temperature = result.temperature;

          // capability onoff
          if (state != this.getCapabilityValue('onoff')) {
            this.setCapabilityValue('onoff', state);
          }

          // capability measure_power
          if (power != this.getCapabilityValue('measure_power')) {
            this.setCapabilityValue('measure_power', power);
          }

          // capability meter_power_wmin
          if(this.hasCapability('meter_power_wmin')) {
            if (total_consumption != this.getCapabilityValue('meter_power_wmin')) {
              this.setCapabilityValue('meter_power_wmin', total_consumption);
            }
          }

          // capability meter_power
          if(this.hasCapability('meter_power')) {
            let meter_power = total_consumption * 0.000017;
            if (meter_power != this.getCapabilityValue('meter_power')) {
              this.setCapabilityValue('meter_power', meter_power);
            }
          }

          // capability measure_temperature
          if(this.hasCapability('measure_temperature')) {
            if (temperature != this.getCapabilityValue('measure_temperature')) {
              this.setCapabilityValue('measure_temperature', temperature);
            }
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

  triggerCallbackEvents(action) {
    return Homey.ManagerFlow.getCard('trigger', "triggerCallbackEvents").trigger(this, {"action": action}, {})
  }

}

module.exports = ShellyPlugSDevice;
