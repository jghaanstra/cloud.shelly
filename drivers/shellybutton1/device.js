'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
  'shortpush',
  'double_shortpush',
  'triple_shortpush',
  'longpush'
];
// TODO: REMOVE AFTER 3.1.0
const temp_callbacks = [
  'shortpush',
  'double_shortpush',
  'triple_shortpush',
  'longpush'
];

class ShellyButton1Device extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');

    // TODO: REMOVE AFTER 3.1.0
    this.homey.flow.getDeviceTriggerCard('triggerInput');

    this.setAvailable();

    if (!this.getStoreValue('SDK') === 3) {
      // TODO: REMOVE AFTER 3.1.0
      if (this.hasCapability('measure_voltage')) {
        this.removeCapability('measure_voltage');
      }
      if (this.hasCapability('alarm_generic')) {
        this.removeCapability('alarm_generic');
      }
      if (!this.hasCapability('input_1')) {
        this.addCapability('input_1');
      }
      if (this.hasCapability('button.callbackevents')) {
        this.removeCapability('button.callbackevents');
      }
      if (this.hasCapability('button.removecallbackevents')) {
        this.removeCapability('button.removecallbackevents');
      }
      this.setStoreValue("SDK", 3);
    }

    // UPDATE INITIAL STATE AND POLLING IF NEEDED
    if (this.homey.settings.get('general_coap')) {
      setInterval(async () => {
        await this.initialStateUpdate();
      }, this.homey.settings.get('general_polling_frequency') * 1000 || 5000);
    }

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

      let measure_battery = result.bat.value;
      let input_1 = result.inputs[0].input == 1 ? true : false;

      // capability measure_power
      if (measure_battery != this.getCapabilityValue('measure_battery')) {
        this.setCapabilityValue('measure_battery', measure_battery);
      }

      // capability input_1
      if (input_1 != this.getCapabilityValue('input_1')) {
        this.setCapabilityValue('input_1', input_1);
        if (input_1) {
          this.homey.flow.getDeviceTriggerCard('triggerInput1On').trigger(this, {}, {});
        } else {
          this.homey.flow.getDeviceTriggerCard('triggerInput1Off').trigger(this, {}, {});
        }
      }

    } catch (error) {
      this.log('Shelly Button 1 is probably asleep and disconnected');
    }
  }

  async deviceCoapReport(capability, value) {
    try {
      if (!this.getAvailable()) { this.setAvailable(); }

      switch(capability) {
        case 'battery':
          if (value != this.getCapabilityValue('measure_battery')) {
            this.setCapabilityValue('measure_battery', value);
          }
          break;
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
        case 'wakeUpEvent':
          break;
        case 'inputEvent0':
          let actionEvent = this.util.getActionEventDescription(value);
          this.setStoreValue('actionEvent', actionEvent);
          break;
        case 'inputEventCounter0':
          if (value > 0) {
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')});
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
    return await this.util.removeCallbackEvents('/settings/actions?index=0&name=', temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

}

module.exports = ShellyButton1Device;
