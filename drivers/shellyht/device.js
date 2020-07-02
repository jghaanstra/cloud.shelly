'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');
const callbacks = [
  'report'
];

class ShellyhtDevice extends Homey.Device {

  onInit() {
    this.setAvailable();
    util.addCallbackEvents('/settings?', callbacks, 'shellyht', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));

    // ADD MISSING CAPABILITIES
    if (!this.hasCapability('button.callbackevents')) {
      this.addCapability('button.callbackevents');
      util.addCallbackEvents('/settings?', callbacks, 'shellyht', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    }
    if (!this.hasCapability('button.removecallbackevents')) {
      this.addCapability('button.removecallbackevents');
    }

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('button.callbackevents', async () => {
      return await util.addCallbackEvents('/settings?', callbacks, 'shellyht', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await util.removeCallbackEvents('/settings?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onAdded() {
    return await util.addCallbackEvents('/settings?', callbacks, 'shellyht', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

  async onDeleted() {
    try {
      clearInterval(this.pollingInterval);
      clearInterval(this.pingInterval);
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await util.removeCallbackEvents('/settings?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.removeIcon(iconpath);
      return;
    } catch (error) {
      throw new Error(error);
      this.log(error);
    }
  }

  // HELPER FUNCTIONS
  updateReportStatus(device, status) {
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

    /* needed because report_url does not report battery value */
    util.sendCommand('/status', device.getSetting('address'), device.getSetting('username'), device.getSetting('password'))
      .then(result => {
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

      })
      .catch(error => {
        this.log(error);
      })

    return true;
  }

}

module.exports = ShellyhtDevice;
