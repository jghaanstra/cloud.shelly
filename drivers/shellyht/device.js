'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class ShellyhtDevice extends Homey.Device {

  onInit() {
    var interval = 4;
    this.pollDevice(interval);
    this.setAvailable();
  }

  onDeleted() {
    clearInterval(this.pollingInterval);
  }

  // HELPER FUNCTIONS
  pollDevice(interval) {
    clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          let humidity = result.hum.value;
          let temperature = result.tmp.value;
          let battery = result.bat.value;
          let voltage = result.bat.voltage;

          // capability measure_humidity
          if (humidity != this.getCapabilityValue('measure_humidity')) {
            this.setCapabilityValue('measure_humidity', humidity);
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
          this.log('Device asleep or disconnected');
        })
    }, 1000 * interval);
  }

}

module.exports = ShellyhtDevice;
