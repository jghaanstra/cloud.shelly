'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [];
// TODO: REMOVE AFTER 3.1.0
const temp_callbacks = [
  'alarm_off',
  'alarm_mild',
  'alarm_heavy'
];

class ShellyGasDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerGasConcentration');

    this.setAvailable();

    // TODO: ADD AND REMOVE STUFF - REMOVE CODE AFTER 3.1.0
    if (this.hasCapability('button.callbackevents')) {
      this.removeCapability('button.callbackevents');
    }
    if (this.hasCapability('button.removecallbackevents')) {
      this.removeCapability('button.removecallbackevents');
    }

    // UPDATE INITIAL STATE
    this.initialStateUpdate();

  }

  async onAdded() {
    return await this.homey.app.updateShellyCollection();
  }

  async onDeleted() {
    try {
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await this.util.removeIcon(iconpath);
      await this.homey.app.updateShellyCollection();
      return;
    } catch (error) {
      this.log(error);
    }
  }

  // HELPER FUNCTIONS
  async initialStateUpdate() {
    try {
      let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      if (!this.getAvailable()) { this.setAvailable(); }

      if (result.gas_sensor.alarm_state == 'mild' || result.gas_sensor.alarm_state == 'heavy') {
        var alarm = true;
      } else {
        var alarm = false;
      }
      let gas_concentration = Number(result.concentration.ppm);

      // capability alarm_smoke
      if (alarm != this.getCapabilityValue('alarm_smoke')) {
        this.setCapabilityValue('alarm_smoke', alarm);
      }

      // capability gas_concentration
      if (gas_concentration != this.getCapabilityValue('gas_concentration')) {
        this.setCapabilityValue('gas_concentration', gas_concentration);
      }
    } catch (error) {
      this.setUnavailable(this.homey.__('device.unreachable') + error.message);
      this.log(error);
    }
  }

  async deviceCoapReport(capability, value) {
    try {
      if (!this.getAvailable()) { this.setAvailable(); }

      switch(capability) {
        case 'gas':
          if (value === 'mild' || value === 'heavy') {
            var alarm = true;
          } else {
            var alarm = false;
          }
          if (alarm != this.getCapabilityValue('alarm_smoke')) {
            this.setCapabilityValue('alarm_smoke', alarm);
          }
          break;
        case 'concentration':
          if (value != this.getCapabilityValue('gas_concentration')) {
            this.setCapabilityValue('gas_concentration', value);
            this.homey.flow.getDeviceTriggerCard('triggerGasConcentration').trigger(this, {'ppm': value}, {})
          }
          break;
        default:
          //this.log('Device does not support reported capability '+ capability +' with value '+ value);
      }
      return Promise.resolve(true);
    } catch(error) {
      this.log(error);
      return Promise.reject(error);
    }
  }

  getCallbacks() {
    return callbacks;
  }

  // TODO: REMOVE AFTER 3.1.0
  async removeCallbacks() {
    await this.util.removeCallbackEvents('/settings?', temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    await this.util.removeCallbackEvents('/settings/actions?index=0&name=', temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    return Promise.resolve(true);
  }

}

module.exports = ShellyGasDevice;
