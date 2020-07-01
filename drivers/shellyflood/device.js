'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');
const callbacks = [
  'flood_detected',
  'flood_gone',
  'report'
];

class ShellyFloodDevice extends Homey.Device {

  onInit() {
    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('button.callbackevents', async () => {
      return await util.addCallbackEvents('/settings?', callbacks, 'shellyflood', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await util.removeCallbackEvents('/settings?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onAdded() {
    return await util.addCallbackEvents('/settings?', callbacks, 'shellyflood', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
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
    var alarm = Number(status.flood) == 0 ? false : true;

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
    util.sendCommand('/status', device.getSetting('address'), device.getSetting('username'), device.getSetting('password'))
      .then(result => {
        let battery = result.bat.value;

        // capability measure_power
        if (battery != this.getCapabilityValue('measure_battery')) {
          this.setCapabilityValue('measure_battery', battery);
        }

      })
      .catch(error => {
        this.log(error);
      })

    return true;
  }

}

module.exports = ShellyFloodDevice;
