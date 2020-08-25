'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
  'alarm_off',
  'alarm_mild',
  'alarm_heavy'
];

class ShellyGasDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerGasConcentration');

    this.pollDevice();
    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('button.callbackevents', async () => {
      return await this.util.addCallbackEvents('/settings?', callbacks, 'shellygas', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await this.util.removeCallbackEvents('/settings?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onAdded() {
    return await this.util.addCallbackEvents('/settings?', callbacks, 'shellygas', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

  async onDeleted() {
    try {
      clearInterval(this.pollingInterval);
      clearInterval(this.pingInterval);
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await this.util.removeCallbackEvents('/settings?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
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
        let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        clearTimeout(this.offlineTimeout);

        if (result.gas_sensor.alarm_state == 'mild' || result.gas_sensor.alarm_state == 'heavy') {
          let alarm = true;
        } else {
          let alarm = false;
        }
        let gas_concentration = Number(result.concentration.ppm);

        // capability alarm_smoke
        if (alarm != this.getCapabilityValue('alarm_smoke')) {
          this.setCapabilityValue('alarm_smoke', alarm);
        }

        // capability gas_concentration
        if (gas_concentration != this.getCapabilityValue('gas_concentration')) {
          this.setCapabilityValue('gas_concentration', gas_concentration);
          this.homey.flow.getDeviceTriggerCard('triggerGasConcentration').trigger(this, {'ppm': gas_concentration}, {})
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

module.exports = ShellyGasDevice;
