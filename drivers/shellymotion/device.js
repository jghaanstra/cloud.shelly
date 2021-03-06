'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [];

class ShellyMotionDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.setAvailable();

    // SET UNICAST, DO INITIAL STATE OVER HTTP AND START POLLING IF COAP IS DISABLED
    this.bootSequence();

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
  async bootSequence() {
    try {
      if (this.homey.settings.get('general_coap')) {
        setInterval(() => {
          this.initialStateUpdate();
        }, this.homey.settings.get('general_polling_frequency') * 1000 || 5000);
      } else {
        setTimeout(() => {
          this.initialStateUpdate();
        }, 5000);
        if (!this.getStoreValue('unicast') === true) {
          const result = await this.util.setUnicast(this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
          this.setStoreValue("unicast", true);
        }
      }
    } catch (error) {
      this.log(error);
    }
  }

  async initialStateUpdate() {
    try {
      let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      if (!this.getAvailable()) { this.setAvailable(); }

      let alarm_motion = result.sensor.motion;
      let alarm_tamper = result.sensor.vibration;
      let measure_luminance = result.lux.value;
      let measure_battery = result.bat.value;

      // capability alarm_motion
      if (alarm_motion != this.getCapabilityValue('alarm_motion')) {
        this.setCapabilityValue('alarm_motion', alarm_motion);
      }

      // capability alarm_tamper
      if (alarm_tamper != this.getCapabilityValue('alarm_tamper')) {
        this.setCapabilityValue('alarm_tamper', alarm_tamper);
      }

      // capability measure_luminance
      if (measure_luminance != this.getCapabilityValue('measure_luminance')) {
        this.setCapabilityValue('measure_luminance', measure_luminance);
      }

      // capability measure_power
      if (measure_battery != this.getCapabilityValue('measure_battery')) {
        this.setCapabilityValue('measure_battery', measure_battery);
      }

    } catch (error) {
      this.log('Shelly Motion Sensor is probably asleep: '+ error);
    }
  }

  async deviceCoapReport(capability, value) {
    try {
      if (!this.getAvailable()) { this.setAvailable(); }

      switch(capability) {
        case 'motion':
          if (value != this.getCapabilityValue('alarm_motion')) {
            this.setCapabilityValue('alarm_motion', value);
          }
          break;
        case 'vibration':
          if (value != this.getCapabilityValue('alarm_tamper')) {
            this.setCapabilityValue('alarm_tamper', value);
          }
          break;
        case 'illuminance':
          if (value != this.getCapabilityValue('measure_luminance')) {
            this.setCapabilityValue('measure_luminance', value);
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

module.exports = ShellyMotionDevice;
