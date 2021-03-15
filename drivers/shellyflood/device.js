'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [];
// TODO: REMOVE AFTER 3.1.0
const temp_callbacks = [
  'flood_detected',
  'flood_gone',
  'report'
];

class ShellyFloodDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.setAvailable();

    if (!this.getStoreValue('SDK') === 3) {
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
      this.setStoreValue("SDK", 3);
    }

    // START POLLING IF COAP IS DISABLED OR TRY INITIAL UPDATE
    this.bootSequence();

  }

  async onAdded() {
    return await this.homey.app.updateShellyCollection();
  }

  async onDeleted() {
    try {
      clearInterval(this.pollingInterval);
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await this.util.removeIcon(iconpath);
      await this.homey.app.updateShellyCollection();
      return;
    } catch (error) {
      this.log(error);
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
      }
    } catch (error) {
      this.log(error);
    }
  }

  async initialStateUpdate() {
    try {
      let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      if (!this.getAvailable()) { this.setAvailable(); }

      let alarm_water = result.flood;
      let measure_battery = result.bat.value;
      let measure_temperature = result.tmp.value;

      // capability alarm_water
      if (alarm_water != device.getCapabilityValue('alarm_water')) {
        device.setCapabilityValue('alarm_water', alarm_water);
      }

      // capability measure_temperature
      if (measure_temperature != device.getCapabilityValue('measure_temperature')) {
        device.setCapabilityValue('measure_temperature', measure_temperature);
      }

      // capability measure_battery
      if (measure_battery != this.getCapabilityValue('measure_battery')) {
        this.setCapabilityValue('measure_battery', measure_battery);
      }

    } catch (error) {
      this.log('Shelly Flood is probably asleep and disconnected');
    }

  }

  // TODO: REMOVE AFTER 3.1.0
  async updateReportStatus(device, status) {
    try {
      let alarm = Number(status.flood) == 0 ? false : true;

      // capability alarm_water
      if (alarm != device.getCapabilityValue('alarm_water')) {
        device.setCapabilityValue('alarm_water', alarm);
      }

      // capability measure_temperature
      if (Number(status.temp) != device.getCapabilityValue('measure_temperature')) {
        device.setCapabilityValue('measure_temperature', Number(status.temp));
      }

      return Promise.resolve(true);
    } catch (error) {
      this.log('Shelly Flood is probably asleep and disconnected: '+ error);
      return Promise.resolve(true);
    }
  }

  async deviceCoapReport(capability, value) {
    try {
      if (!this.getAvailable()) { this.setAvailable(); }

      // update unicast
      if (!this.getStoreValue('unicast') === true) {
        const result = await this.util.setUnicast(this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        if (result === 'OK') {
          this.setStoreValue("unicast", true);
        }  
      }

      switch(capability) {
        case 'flood':
          if (value != this.getCapabilityValue('alarm_water')) {
            this.setCapabilityValue('alarm_water', value);
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

module.exports = ShellyFloodDevice;
