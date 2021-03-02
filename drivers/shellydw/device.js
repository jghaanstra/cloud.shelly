'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [];
// TODO: REMOVE AFTER 3.1.0
const temp_callbacks = [
  'dark',
  'twilight',
  'open',
  'close',
  'vibration',
  'temp_over',
  'temp_under'
];

class ShellydwDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerTilt');

    this.setAvailable();

    // ADD AND REMOVE CAPABILITIES
    // TODO: REMOVE AFTER 3.1.0
    if (this.hasCapability('measure_voltage')) {
      this.removeCapability('measure_voltage');
    }
    if (this.hasCapability('button.callbackevents')) {
      this.removeCapability('button.callbackevents');
    }
    if (this.hasCapability('button.removecallbackevents')) {
      this.removeCapability('button.removecallbackevents');
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
      let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 'polling');
      if (!this.getAvailable()) { this.setAvailable(); }

      let measure_luminance = result.lux.value;
      let measure_temperature = result.tmp.value;
      let tilt = result.accel.tilt;
      let alarm_tamper = result.accel.vibration === 1 ? true : false;
      let alarm_contact = result.sensor.state === 'open' ? true : false;
      let measure_battery = result.bat.value;

      // capability measure_luminance
      if (measure_luminance != this.getCapabilityValue('measure_luminance')) {
        this.setCapabilityValue('measure_luminance', measure_luminance);
      }

      // capability measure_temperature
      if (measure_temperature != this.getCapabilityValue('measure_temperature')) {
        this.setCapabilityValue('measure_temperature', measure_temperature);
      }

      // capability tilt
      if (tilt != this.getCapabilityValue('tilt')) {
        this.setCapabilityValue('tilt', tilt);
      }

      // capability alarm_tamper
      if (alarm_tamper != this.getCapabilityValue('alarm_tamper')) {
        this.setCapabilityValue('alarm_tamper', alarm_tamper);
      }

      // capability alarm_contact
      if (alarm_contact != this.getCapabilityValue('alarm_contact')) {
        this.setCapabilityValue('alarm_contact', alarm_contact);
      }

      // capability measure_power
      if (measure_battery != this.getCapabilityValue('measure_battery')) {
        this.setCapabilityValue('measure_battery', measure_battery);
      }

    } catch (error) {
      this.log('Shelly Door Window Sensor is probably asleep and disconnected'+ error);
    }
  }

  async deviceCoapReport(capability, value) {
    try {
      if (!this.getAvailable()) { this.setAvailable(); }

      switch(capability) {
        case 'state':
          if (value != this.getCapabilityValue('alarm_contact')) {
            this.setCapabilityValue('alarm_contact', value);
          }
          break;
        case 'vibration':
          if (value != this.getCapabilityValue('alarm_tamper')) {
            this.setCapabilityValue('alarm_tamper', value);
          }
          break;
        case 'tilt':
          if (value != this.getCapabilityValue('tilt')) {
            this.setCapabilityValue('tilt', value);
            this.homey.flow.getDeviceTriggerCard('triggerTilt').trigger(this, {'tilt': value}, {});
          }
          break;
        case 'illuminance':
          if (value != this.getCapabilityValue('measure_luminance')) {
            this.setCapabilityValue('measure_luminance', value);
          }
          break;
        case 'temperature':
          if (value != this.getCapabilityValue('measure_temperature')) {
            this.setCapabilityValue('measure_temperature', value);
          }
          break;
        case 'battery':
          if (value != this.getCapabilityValue('measure_battery')) {
            this.setCapabilityValue('measure_battery', value);
          }
          break;
        case 'wakeUpEvent':
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

module.exports = ShellydwDevice;
