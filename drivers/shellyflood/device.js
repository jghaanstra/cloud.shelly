'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
  'flood_detected',
  'flood_gone',
  'report'
];

class ShellyFloodDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('button.callbackevents', async () => {
      return await this.util.addCallbackEvents('/settings?', callbacks, 'shellyflood', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await this.util.removeCallbackEvents('/settings?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onAdded() {
    return await this.util.addCallbackEvents('/settings?', callbacks, 'shellyflood', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
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
      let alarm = Number(status.flood) == 0 ? false : true;

      // capability alarm_water
      if (alarm != device.getCapabilityValue('alarm_water')) {
        device.setCapabilityValue('alarm_water', alarm);
      }

      // capability measure_temperature
      if (Number(status.temp) != device.getCapabilityValue('measure_temperature')) {
        device.setCapabilityValue('measure_temperature', Number(status.temp));
      }

      // capability measure_voltage
      if (Number(status.batV) != this.getCapabilityValue('measure_voltage')) {
        this.setCapabilityValue('measure_voltage', Number(status.batV));
      }

      /* needed because report_url does not report battery value */
      let result = await this.util.sendCommand('/status', device.getSetting('address'), device.getSetting('username'), device.getSetting('password'));
      let battery = result.bat.value;

      // capability measure_power
      if (battery != this.getCapabilityValue('measure_battery')) {
        this.setCapabilityValue('measure_battery', battery);
      }
      return Promise.resolve(true);
    } catch (error) {
      this.log('Shelly Flood is probably asleep and disconnected: '+ error);
      return Promise.resolve(true);
    }

  }

  getCallbacks() {
    return callbacks;
  }

}

module.exports = ShellyFloodDevice;
