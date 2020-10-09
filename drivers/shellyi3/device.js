'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
  'btn_on',
  'btn_off',
  'shortpush',
  'longpush',
  'double_shortpush',
  'double_longpush',
  'triple_shortpush',
  'triple_longpush',
  'shortpush_longpush',
  'longpush_shortpush'
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

  async deviceCoapReport(capability, value) {
    try {
      if (!this.getAvailable()) { this.setAvailable(); }
      
      switch(capability) {
        case 'input0':
          let alarm = value === 0 ? false : true;
          if (alarm != this.getCapabilityValue('alarm_generic')) {
            this.setCapabilityValue('alarm_generic', alarm);
          }
          break;
        case 'input1':
          // TODO: hoe deze coap naar het juist i3 device routeren, er is geen tweede kanaal terwijl de input op 1 eindigt
          let alarm = value === 0 ? false : true;
          if (alarm != this.getCapabilityValue('alarm_generic.1')) {
            this.setCapabilityValue('alarm_generic.1', alarm);
            let status = value === 1 ? "On" : "Off";
            this.homey.flow.getDeviceTriggerCard('triggerInput1').trigger(this, {'status': status}, {});
          }
          break;
        case 'input2':
          // TODO: hoe deze coap naar het juist i3 device routeren, er is geen tweede kanaal terwijl de input op 1 eindigt
          let alarm = value === 0 ? false : true;
          if (alarm != this.getCapabilityValue('alarm_generic.2')) {
            this.setCapabilityValue('alarm_generic.2', alarm);
            let status = value === 1 ? "On" : "Off";
            this.homey.flow.getDeviceTriggerCard('triggerInput2').trigger(this, {'status': status}, {});
          }
          break;
        default:
          this.log('Device does not support reported capability.');
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

}

module.exports = Shellyi3Device;
