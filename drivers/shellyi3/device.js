'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const semver = require('semver');
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

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput2On');
    this.homey.flow.getDeviceTriggerCard('triggerInput2Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput3On');
    this.homey.flow.getDeviceTriggerCard('triggerInput3Off');

    // TODO: REMOVE AFTER 3.1.0
    this.homey.flow.getDeviceTriggerCard('triggerInput');
    this.homey.flow.getDeviceTriggerCard('triggerInput1');
    this.homey.flow.getDeviceTriggerCard('triggerInput2');

    this.setAvailable();

    if (!this.getStoreValue('SDK') === 3) {
      // TODO: REMOVE AFTER 3.1.0
      if (this.hasCapability('alarm_generic')) {
        this.removeCapability('alarm_generic');
      }
      if (this.hasCapability('alarm_generic.1')) {
        this.removeCapability('alarm_generic.1');
      }
      if (this.hasCapability('alarm_generic.2')) {
        this.removeCapability('alarm_generic.2');
      }
      if (!this.hasCapability('input_1')) {
        this.addCapability('input_1');
      }
      if (!this.hasCapability('input_2')) {
        this.addCapability('input_2');
      }
      if (!this.hasCapability('input_3')) {
        this.addCapability('input_3');
      }
      if (this.hasCapability('button.callbackevents')) {
        this.removeCapability('button.callbackevents');
      }
      if (this.hasCapability('button.removecallbackevents')) {
        this.removeCapability('button.removecallbackevents');
      }
      this.setStoreValue("SDK", 3);
    }

    // SET UNICAST, DO INITIAL STATE OVER HTTP AND START POLLING IF COAP IS DISABLED
    this.bootSequence();

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
      clearInterval(this.pollingInterval);
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
  async bootSequence() {
    try {
      if (this.homey.settings.get('general_coap')) {
        this.pollingInterval = setInterval(() => {
          this.initialStateUpdate();
        }, this.homey.settings.get('general_polling_frequency') * 1000 || 5000);
      } else {
        setTimeout(() => {
          this.initialStateUpdate();
        }, this.util.getRandomTimeout(10));
        this.pollingInterval = setInterval(() => {
          this.initialStateUpdate();
        }, 60000);
      }
    } catch (error) {
      this.log(error);
    }
  }

  async initialStateUpdate() {
    try {
      let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      if (!this.getAvailable()) { this.setAvailable(); }

      let input_1 = result.inputs[0].input == 1 ? true : false;
      let input_2 = result.inputs[1].input == 1 ? true : false;
      let input_3 = result.inputs[2].input == 1 ? true : false;

      // capability input_1
      if (input_1 != this.getCapabilityValue('input_1')) {
        this.setCapabilityValue('input_1', input_1);
        if (input_1) {
          this.homey.flow.getDeviceTriggerCard('triggerInput1On').trigger(this, {}, {});
        } else {
          this.homey.flow.getDeviceTriggerCard('triggerInput1Off').trigger(this, {}, {});
        }
      }

      // capability input_2
      if (input_2 != this.getCapabilityValue('input_2')) {
        this.setCapabilityValue('input_2', input_2);
        if (input_2) {
          this.homey.flow.getDeviceTriggerCard('triggerInput2On').trigger(this, {}, {});
        } else {
          this.homey.flow.getDeviceTriggerCard('triggerInput2Off').trigger(this, {}, {});
        }
      }

      // capability input_3
      if (input_3 != this.getCapabilityValue('input_3')) {
        this.setCapabilityValue('input_3', input_3);
        if (input_3) {
          this.homey.flow.getDeviceTriggerCard('triggerInput3On').trigger(this, {}, {});
        } else {
          this.homey.flow.getDeviceTriggerCard('triggerInput3Off').trigger(this, {}, {});
        }
      }

      // update unicast
      const version = result.update.old_version.match(/v([0-9a-z.-]+)/)[1];
      if (semver.gt(version, '1.9.9') && !this.getStoreValue('unicast') === true) {
        const result = await this.util.setUnicast(this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        if (result === 'OK') {
          this.setStoreValue("unicast", true);
        }  
      }

    } catch (error) {
      this.setUnavailable(this.homey.__('device.unreachable') + error.message);
      this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": this.getName(), "device_error": error.message});
      this.log(error);
    }
  }

  async deviceCoapReport(capability, value) {
    try {
      if (!this.getAvailable()) { this.setAvailable(); }

      switch(capability) {
        case 'input0':
          let input_1 = value === 0 ? false : true;
          if (input_1 != this.getCapabilityValue('input_1')) {
            this.setCapabilityValue('input_1', input_1);
            if (input_1) {
              this.homey.flow.getDeviceTriggerCard('triggerInput1On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInput1Off').trigger(this, {}, {});
            }
          }
          break;
        case 'input1':
          let input_2 = value === 0 ? false : true;
          if (input_2 != this.getCapabilityValue('input_2')) {
            this.setCapabilityValue('input_2', input_2);
            if (input_2) {
              this.homey.flow.getDeviceTriggerCard('triggerInput2On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInput2Off').trigger(this, {}, {});
            }
          }
          break;
        case 'input2':
          let input_3 = value === 0 ? false : true;
          if (input_3 != this.getCapabilityValue('input_3')) {
            this.setCapabilityValue('input_3', input_3);
            if (input_3) {
              this.homey.flow.getDeviceTriggerCard('triggerInput3On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInput3Off').trigger(this, {}, {});
            }
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
