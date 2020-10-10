'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
  'shortpush',
  'double_shortpush',
  'triple_shortpush',
  'longpush'
];

class ShellyButton1Device extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.setAvailable();

    // ADD AND REMOVE CAPABILITIES
    // TODO: REMOVE AFTER 3.1.0
    if (this.hasCapability('measure_voltage')) {
      this.removeCapability('measure_voltage');
    }
    if (!this.hasCapability('alarm_generic')) {
      this.addCapability('alarm_generic');
    }

    // UPDATE INITIAL STATE
    this.initialStateUpdate();

    this.registerCapabilityListener('button.callbackevents', async () => {
      return await this.util.addCallbackEvents('/settings/input/0?', callbacks, 'shellybutton1', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await this.util.removeCallbackEvents('/settings/input/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onAdded() {
    await this.homey.app.updateShellyCollection();
    await this.util.addCallbackEvents('/settings/input/0?', callbacks, 'shellybutton1', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    return;
  }

  async onDeleted() {
    try {
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await this.util.removeCallbackEvents('/settings/input/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
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
      let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 'polling');
      if (!this.getAvailable()) { this.setAvailable(); }

      let measure_battery = result.bat.value;
      let alarm_generic = result.inputs[0].input == 1 ? true : false;

      // capability measure_power
      if (measure_battery != this.getCapabilityValue('measure_battery')) {
        this.setCapabilityValue('measure_battery', measure_battery);
      }

      // capability alarm_generic
      if (alarm_generic != this.getCapabilityValue('alarm_generic')) {
        this.setCapabilityValue('alarm_generic', alarm_generic);
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
          let alarm = value === 0 ? false : true;
          if (alarm != this.getCapabilityValue('alarm_generic')) {
            this.setCapabilityValue('alarm_generic', alarm);
          }
          break;
        case 'wakeUpEvent':
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
    return callbacks;
  }

}

module.exports = ShellyButton1Device;
