'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');
const callbacks = [
  'dark',
  'twilight',
  'close',
  'vibration'
];

class ShellydwDevice extends Homey.Device {

  onInit() {
    this.pollDevice();
    this.setAvailable();

    // ADD MISSING CAPABILITIES
    if (!this.hasCapability('alarm_tamper')) {
      this.addCapability('alarm_tamper');
    }

    this.registerCapabilityListener('button.callbackevents', async () => {
      return await util.addCallbackEvents('/settings?', callbacks, 'shellydw', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await util.removeCallbackEvents('/settings?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onDeleted() {
    try {
      clearInterval(this.pollingInterval);
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await util.removeIcon(iconpath);
      await util.removeCallbackEvents('/settings?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      return;
    } catch (error) {
      throw new Error(error);
      this.log(error);
    }
  }

  // HELPER FUNCTIONS
  pollDevice() {
    clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          let alarm = false;
          let state = result.sensor.state;
          let lux = result.lux.value;
          let battery = result.bat.value;
          let voltage = result.bat.voltage;
          let tamper = result.accel.vibration == 1 ? true : false;

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

          // capability alarm_tamper
          if (tamper != this.getCapabilityValue('alarm_tamper')) {
            this.setCapabilityValue('alarm_tamper', tamper);
          }

        })
        .catch(error => {
          this.log('Device asleep or disconnected');
        })
    }, 4000);
  }

}

module.exports = ShellydwDevice;
