'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [];

class ShellySmokeDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.pollDevice();
    this.setAvailable();
  }

  async onDeleted() {
    try {
      clearInterval(this.pollingInterval);
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await this.util.removeIcon(iconpath);
      return;
    } catch (error) {
      this.log(error);
    }
  }

  // HELPER FUNCTIONS
  pollDevice() {
    clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(async () => {
      try {
        let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 'polling');
        let alarm = result.smoke;
        let temperature = result.tmp.value;
        let battery = result.bat.value;
        let voltage = result.bat.voltage;

        // capability alarm_smoke
        if (alarm != this.getCapabilityValue('alarm_smoke')) {
          this.setCapabilityValue('alarm_smoke', alarm);
        }

        // capability measure_temperature
        if (temperature != this.getCapabilityValue('measure_temperature')) {
          this.setCapabilityValue('measure_temperature', temperature);
        }

        // capability measure_power
        if (battery != this.getCapabilityValue('measure_battery')) {
          this.setCapabilityValue('measure_battery', battery);
        }

        // capability measure_voltage
        if (voltage != this.getCapabilityValue('measure_voltage')) {
          this.setCapabilityValue('measure_voltage', voltage);
        }
      } catch (error) {
        this.log('Shelly Smoke is probably asleep and disconnected'+ error);
        return Promise.resolve(true);
      }
    }, 4000);
  }

  getCallbacks() {
    return callbacks;
  }

}

module.exports = ShellySmokeDevice;
