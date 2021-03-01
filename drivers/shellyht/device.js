'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [];
// TODO: REMOVE AFTER 3.1.0
const temp_callbacks = [
  'report'
];

class ShellyhtDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

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
      }, 5000);
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

      let measure_temperature = result.tmp.value;
      let measure_humidity = result.hum.value;
      let measure_battery = result.bat.value;

      // capability measure_temperature
      if (measure_temperature != device.getCapabilityValue('measure_temperature')) {
        device.setCapabilityValue('measure_temperature', measure_temperature);
      }

      // capability measure_humidity
      if (measure_humidity != device.getCapabilityValue('measure_humidity')) {
        device.setCapabilityValue('measure_humidity', measure_humidity);
      }

      // capability measure_battery
      if (measure_battery != this.getCapabilityValue('measure_battery')) {
        this.setCapabilityValue('measure_battery', measure_battery);
      }

    } catch (error) {
      this.log('Shelly HT is probably asleep and disconnected');
    }

  }

  // TODO: REMOVE AFTER 3.1.0
  async updateReportStatus(device, status) {
    try {
      let humidity = Number(status.hum);
      let temperature = Number(status.temp);

      // capability measure_humidity
      if (humidity != this.getCapabilityValue('measure_humidity')) {
        this.setCapabilityValue('measure_humidity', humidity);
      }

      // capability measure_temperature
      if (temperature != this.getCapabilityValue('measure_temperature')) {
        this.setCapabilityValue('measure_temperature', temperature);
      }

      return Promise.resolve(true);
    } catch (error) {
      this.log('Shelly HT is probably asleep and disconnected: '+ error);
      return Promise.resolve(true);
    }
  }

  async deviceCoapReport(capability, value) {
    try {
      if (!this.getAvailable()) { this.setAvailable(); }

      switch(capability) {
        case 'humidity':
          if (value != this.getCapabilityValue('measure_humidity')) {
            this.setCapabilityValue('measure_humidity', value);
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

module.exports = ShellyhtDevice;
