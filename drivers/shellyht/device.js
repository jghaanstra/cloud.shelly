'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
  'report'
];

class ShellyhtDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('button.callbackevents', async () => {
      return await this.util.addCallbackEvents('/settings?', callbacks, 'shellyht', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await this.util.removeCallbackEvents('/settings?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onAdded() {
    return await this.util.addCallbackEvents('/settings?', callbacks, 'shellyht', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

  async onDeleted() {
    try {
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await this.util.removeCallbackEvents('/settings?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await this.util.removeIcon(iconpath);
      return;
    } catch (error) {
      this.log(error);
    }
  }

  // HELPER FUNCTIONS
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

      /* needed because report_url does not report battery value and voltage */
      let result = await this.util.sendCommand('/status', device.getSetting('address'), device.getSetting('username'), device.getSetting('password'));
      let battery = result.bat.value;
      let voltage = result.bat.voltage;

      // capability measure_power
      if (battery != this.getCapabilityValue('measure_battery')) {
        this.setCapabilityValue('measure_battery', battery);
      }

      // capability measure_voltage
      if (voltage != this.getCapabilityValue('measure_voltage')) {
        this.setCapabilityValue('measure_voltage', voltage);
      }
      return Promise.resolve(true);
    } catch (error) {
      this.log('Shelly HT is probably asleep and disconnected: '+ error);
      return Promise.resolve(true);
    }
  }

  getCallbacks() {
    return callbacks;
  }

}

module.exports = ShellyhtDevice;
