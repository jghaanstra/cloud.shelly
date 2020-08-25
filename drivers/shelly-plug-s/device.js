'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
  'btn_on',
  'out_on',
  'out_off'
];

class ShellyPlugSDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.pollDevice();
    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      const path = value ? '/relay/0?turn=on' : '/relay/0?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.callbackevents', async () => {
      return await this.util.addCallbackEvents('/settings/relay/0?', callbacks, 'shelly-plug-s', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await this.util.removeCallbackEvents('/settings/relay/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  /*async onAdded() {
    return await this.util.addCallbackEvents('/settings/relay/0?', callbacks, 'shelly-plug-s', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }*/

  async onDeleted() {
    try {
      clearInterval(this.pollingInterval);
      clearInterval(this.pingInterval);
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await this.util.removeCallbackEvents('/settings/relay/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await this.util.removeIcon(iconpath);
      return;
    } catch (error) {
      this.log(error);
    }
  }

  // HELPER FUNCTIONS
  pollDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(async () => {
      try {
        let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 'polling');
        clearTimeout(this.offlineTimeout);

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
      } catch (error) {
        this.log(error);
        this.setUnavailable(this.homey.__('device.unreachable') + error.message);
        this.pingDevice();

        this.offlineTimeout = setTimeout(() => {
          this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": this.getName(), "device_error": error.toString()});
        }, 60000 * this.getSetting('offline'));
      }

    }, 1000 * this.getSetting('polling'));
  }

  pingDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pingInterval = setInterval(async () => {
      try {
        let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 'polling');
        this.setAvailable();
        this.pollDevice();
      } catch (error) {
        this.log('Device is not reachable, pinging every 63 seconds to see if it comes online again.');
      }
    }, 63000);
  }

  getCallbacks() {
    return callbacks;
  }

}

module.exports = ShellyPlugSDevice;
