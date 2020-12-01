'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
  'shortpush',
  'longpush',
  'double_shortpush',
  'triple_shortpush',
  'shortpush_longpush',
  'longpush_shortpush'
];
const callbacks_triggers = [
  'shortpush_1',
  'longpush_1',
  'double_shortpush_1',
  'triple_shortpush_1',
  'shortpush_longpush_1',
  'longpush_shortpush_1',
  'shortpush_2',
  'longpush_2',
  'double_shortpush_2',
  'triple_shortpush_2',
  'shortpush_longpush_2',
  'longpush_shortpush_2',
  'shortpush_3',
  'longpush_3',
  'double_shortpush_3',
  'triple_shortpush_3',
  'shortpush_longpush_3',
  'longpush_shortpush_3'
];
// TODO: REMOVE AFTER 3.1.0
const temp_callbacks = [
  'btn_on',
  'btn_off',
  'shortpush',
  'longpush',
  'double_shortpush',
  'triple_shortpush',
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
    try {
      return await this.homey.app.updateShellyCollection();
    } catch (error) {
      this.log(error);
      return Promise.resolve(error);
    }
  }

  async onDeleted() {
    try {
      const iconpath = "/userdata/" + this.getData().id +".svg";
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
        case 'inputEvent0':
          let actionEvent1 = this.util.getActionEventDescription(value) + '_1';
          this.setStoreValue('actionEvent1', actionEvent1);
          break;
        case 'inputEvent1':
          let actionEvent2 = this.util.getActionEventDescription(value) + '_2';
          this.setStoreValue('actionEvent2', actionEvent2);
          break;
        case 'inputEvent2':
          let actionEvent3 = this.util.getActionEventDescription(value) + '_3';
          this.setStoreValue('actionEvent3', actionEvent3);
          break;
        case 'inputEventCounter0':
          if (value > 0) {
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent1')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent1')});
          }
          break;
        case 'inputEventCounter1':
          if (value > 0) {
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent2')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent2')});
          }
          break;
        case 'inputEventCounter2':
          if (value > 0) {
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent3')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent3')});
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
    return callbacks_triggers;
  }

  // TODO: REMOVE AFTER 3.1.0
  async removeCallbacks() {
    await this.util.removeCallbackEvents('/settings/actions?index=0&name=', temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    await this.util.removeCallbackEvents('/settings/actions?index=1&name=', temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    await this.util.removeCallbackEvents('/settings/actions?index=2&name=', temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    return Promise.resolve(true);
  }

}

module.exports = Shellyi3Device;
