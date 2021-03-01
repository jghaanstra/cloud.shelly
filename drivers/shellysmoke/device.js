'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [];

class ShellySmokeDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.setAvailable();

    // REMOVE CAPABILITIES
    // TODO: REMOVE AFTER 3.1.0
    if (this.hasCapability('measure_voltage')) {
      this.removeCapability('measure_voltage');
    }

    // UPDATE INITIAL STATE AND POLLING IF NEEDED
    if (this.homey.settings.get('general_coap')) {
      setInterval(async () => {
        await this.initialStateUpdate();
      }, 5000);
    } else {
      this.initialStateUpdate();
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

      let alarm_smoke = result.smoke;
      let measure_temperature = result.tmp.value;
      let measure_battery = result.bat.value;

      // capability alarm_smoke
      if (alarm_smoke != this.getCapabilityValue('alarm_smoke')) {
        this.setCapabilityValue('alarm_smoke', alarm_smoke);
      }

      // capability measure_temperature
      if (measure_temperature != this.getCapabilityValue('measure_temperature')) {
        this.setCapabilityValue('measure_temperature', measure_temperature);
      }

      // capability measure_battery
      if (measure_battery != this.getCapabilityValue('measure_battery')) {
        this.setCapabilityValue('measure_battery', measure_battery);
      }

    } catch (error) {
      this.log('Shelly Smoke is probably asleep and disconnected'+ error);
      return Promise.resolve(true);
    }
  }

  async deviceCoapReport(capability, value) {
    try {
      if (!this.getAvailable()) { this.setAvailable(); }

      switch(capability) {
        case 'smoke':
          if (value != this.getCapabilityValue('alarm_smoke')) {
            this.setCapabilityValue('alarm_smoke', value);
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

}

module.exports = ShellySmokeDevice;
