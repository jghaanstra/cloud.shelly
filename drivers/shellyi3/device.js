'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
  'btn_on',
  'btn_off',
  'shortpush',
  'longpush',
  'double_shortpush',
  'triple_shortpush',
  'shortpush_longpush',
  'longpush_shortpush'
];
const callbacks_triggers = [
  'btn_on_1',
  'btn_off_1',
  'shortpush_1',
  'longpush_1',
  'double_shortpush_1',
  'triple_shortpush_1',
  'shortpush_longpush_1',
  'longpush_shortpush_1',
  'btn_on_2',
  'btn_off_2',
  'shortpush_2',
  'longpush_2',
  'double_shortpush_2',
  'triple_shortpush_2',
  'shortpush_longpush_2',
  'longpush_shortpush_2',
  'btn_on_3',
  'btn_off_3',
  'shortpush_3',
  'longpush_3',
  'double_shortpush_3',
  'triple_shortpush_3',
  'shortpush_longpush_3',
  'longpush_shortpush_3'
];

class Shellyi3Device extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerInput1');
    this.homey.flow.getDeviceTriggerCard('triggerInput2');

    this.setAvailable();

    // ADD AND REMOVE CAPABILITIES
    // TODO: REMOVE AFTER 3.1.0
    if (!this.hasCapability('alarm_generic')) {
      this.addCapability('alarm_generic');
    }
    if (!this.hasCapability('alarm_generic.1')) {
      this.addCapability('alarm_generic.1');
    }
    if (!this.hasCapability('alarm_generic.2')) {
      this.addCapability('alarm_generic.2');
    }

    // UPDATE INITIAL STATE
    this.initialStateUpdate();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('button.callbackevents', async () => {
      try {
        await this.util.addCallbackEvents('/settings/input/0?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 1);
        await this.util.addCallbackEvents('/settings/input/1?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 2);
        await this.util.addCallbackEvents('/settings/input/2?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 3);
        return Promise.resolve(true);
      } catch (error) {
        this.log(error);
        return Promise.resolve(error);
      }
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      try {
        await this.util.removeCallbackEvents('/settings/input/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await this.util.removeCallbackEvents('/settings/input/1?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await this.util.removeCallbackEvents('/settings/input/2?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return Promise.resolve(true);
      } catch (error) {
        this.log(error);
        return Promise.resolve(error);
      }
    });

  }

  async onAdded() {
    try {
      await this.util.addCallbackEvents('/settings/input/0?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 1);
      await this.util.addCallbackEvents('/settings/input/1?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 2);
      await this.util.addCallbackEvents('/settings/input/2?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 3);
      await this.homey.app.updateShellyCollection();
      return Promise.resolve(true);
    } catch (error) {
      this.log(error);
      return Promise.resolve(error);
    }
  }

  async onDeleted() {
    try {
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await this.util.removeCallbackEvents('/settings/input/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await this.util.removeCallbackEvents('/settings/input/1?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await this.util.removeCallbackEvents('/settings/input/2?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await this.util.removeIcon(iconpath);
      await this.homey.app.updateShellyCollection();
      return Promise.resolve(true);
    } catch (error) {
      this.log(error);
      return Promise.resolve(error);
    }
  }

  // HELPER FUNCTIONS
  async initialStateUpdate() {
    try {
      let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      if (!this.getAvailable()) { this.setAvailable(); }

      let alarm_generic = result.inputs[0].input == 1 ? true : false;
      let alarm_generic_1 = result.inputs[1].input == 1 ? true : false;
      let alarm_generic_2 = result.inputs[2].input == 1 ? true : false;

      // capability alarm_generic
      if (alarm_generic != this.getCapabilityValue('alarm_generic')) {
        this.setCapabilityValue('alarm_generic', alarm_generic);
      }

      // capability alarm_generic.1
      if (alarm_generic_1 != this.getCapabilityValue('alarm_generic.1')) {
        this.setCapabilityValue('alarm_generic.1', alarm_generic_1);
      }

      // capability alarm_generic.2
      if (alarm_generic_2 != this.getCapabilityValue('alarm_generic.2')) {
        this.setCapabilityValue('alarm_generic.2', alarm_generic_2);
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
        case 'input0':
          let alarm_generic = value === 0 ? false : true;
          if (alarm_generic != this.getCapabilityValue('alarm_generic')) {
            this.setCapabilityValue('alarm_generic', alarm_generic);
          }
          break;
        case 'input1':
          let alarm_generic_1 = value === 0 ? false : true;
          if (alarm_generic_1 != this.getCapabilityValue('alarm_generic.1')) {
            this.setCapabilityValue('alarm_generic.1', alarm_generic_1);
            let status = value === 1 ? "On" : "Off";
            this.homey.flow.getDeviceTriggerCard('triggerInput1').trigger(this, {'status': status}, {});
          }
          break;
        case 'input2':
          let alarm_generic_2 = value === 0 ? false : true;
          if (alarm_generic_2 != this.getCapabilityValue('alarm_generic.2')) {
            this.setCapabilityValue('alarm_generic.2', alarm_generic_2);
            let status = value === 1 ? "On" : "Off";
            this.homey.flow.getDeviceTriggerCard('triggerInput2').trigger(this, {'status': status}, {});
          }
          break;
        default:
          this.log('Device does not support reported capability '+ capability +' with value '+ value);
      }
      return Promise.resolve(true);
    } catch(error) {
      this.log(error);
      return Promise.reject(error);
    }
  }

  getCallbacks() {
    return callbacks_triggers;
  }

}

module.exports = Shellyi3Device;
