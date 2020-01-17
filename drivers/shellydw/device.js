'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class ShellydwDevice extends Homey.Device {

  onInit() {
    var interval = 4;
    this.pollDevice(interval);
    this.setAvailable();
  }

  onDeleted() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);
  }

  // HELPER FUNCTIONS
  pollDevice(interval) {
    clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          let alarm = false;
          let state = result.sensor.state;
          let lux = result.lux.value;
          let battery = result.bat.value;
          let voltage = result.bat.voltage;

          if (state == 'open') {
            alarm = true;
          } else {
            alarm = false;
          }

          // capability alarm_contact
          if (alarm != this.getCapabilityValue('alarm_contact')) {
            this.setCapabilityValue('alarm_contact', alarm);
          }

          // capability measure_luminance
          if (lux != this.getCapabilityValue('measure_luminance')) {
            this.setCapabilityValue('measure_luminance', lux);
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
          this.log('Device asleep or disconnected');
        })
    }, 1000 * interval);
  }

}

module.exports = ShellydwDevice;
