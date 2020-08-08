'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class ShellySmokeDevice extends Homey.Device {

  onInit() {
    this.pollDevice();
    this.setAvailable();
  }

  onDeleted() {
    clearInterval(this.pollingInterval);

    const iconpath = "/userdata/" + this.getData().id +".svg";
    util.removeIcon(iconpath)
      .catch(error => {
        this.log(error);
      });
  }

  // HELPER FUNCTIONS
  pollDevice() {
    clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 'polling')
        .then(result => {
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

        })
        .catch(error => {
          this.log('Shelly Smoke is asleep and disconnected');
        })
    }, 4000);
  }

}

module.exports = ShellySmokeDevice;
