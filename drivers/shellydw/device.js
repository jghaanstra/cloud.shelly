'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
  'dark',
  'twilight',
  'open',
  'close',
  'vibration',
  'temp_over',
  'temp_under'
];

class ShellydwDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerTilt');

    this.pollDevice();
    this.setAvailable();

    this.registerCapabilityListener('button.callbackevents', async () => {
      return await this.util.addCallbackEvents('/settings?', callbacks, 'shellydw', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await this.util.removeCallbackEvents('/settings?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onAdded() {
    return await this.util.addCallbackEvents('/settings?', callbacks, 'shellydw', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

  async onDeleted() {
    try {
      clearInterval(this.pollingInterval);
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await this.util.removeIcon(iconpath);
      await this.util.removeCallbackEvents('/settings?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      return;
    } catch (error) {
      this.log(error);
    }
  }

  // HELPER FUNCTIONS
  pollDevice() {
    clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(() => {
      this.updateReportStatus();
    }, 4000);
  }

  async updateReportStatus() {
    try {
      let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 'polling');
      let state = result.sensor.state;
      let lux = result.lux.value;
      let battery = result.bat.value;
      let voltage = result.bat.voltage;
      let tamper = result.accel.vibration == 1 ? true : false;
      let tilt = result.accel.tilt;
      let alarm = state == 'open' ? true : false;

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

      // capability measure_temperature (only for DW2)
      if (result.tmp.value) {
        if (Number(result.tmp.value) != this.getCapabilityValue('measure_temperature')) {
          this.setCapabilityValue('measure_temperature', Number(result.tmp.value));
        }
      }

      // capability tilt
      if (tilt != this.getCapabilityValue('tilt')) {
        this.setCapabilityValue('tilt', tilt);
        this.homey.flow.getDeviceTriggerCard('triggerTilt').trigger(this, {'tilt': tilt}, {})
      }

      // capability measure_voltage
      if (voltage != this.getCapabilityValue('measure_voltage')) {
        this.setCapabilityValue('measure_voltage', voltage);
      }

      // capability alarm_tamper
      if (tamper != this.getCapabilityValue('alarm_tamper')) {
        this.setCapabilityValue('alarm_tamper', tamper);
      }
      return Promise.resolve(true);
    } catch (error) {
      this.log('Shelly Door/Window (2) is probably asleep and disconnected'+ error);
      return Promise.resolve(true);
    }

  }

  getCallbacks() {
    return callbacks;
  }

}

module.exports = ShellydwDevice;
