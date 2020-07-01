'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');
const callbacks = [
  'alarm_off',
  'alarm_mild',
  'alarm_heavy'
];

class ShellyGasDevice extends Homey.Device {

  onInit() {
    new Homey.FlowCardTriggerDevice('triggerGasConcentration').register();

    this.pollDevice();
    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('button.callbackevents', async () => {
      return await util.addCallbackEvents('/settings?', callbacks, 'shellygas', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await util.removeCallbackEvents('/settings?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

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
  pollDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          clearTimeout(this.offlineTimeout);

          if (result.gas_sensor.alarm_state == 'mild' || result.gas_sensor.alarm_state == 'heavy') {
            let alarm = true;
          } else {
            let alarm = false;
          }
          let gas_concentration = Number(result.concentration.ppm);

          // capability alarm_smoke
          if (alarm != this.getCapabilityValue('alarm_smoke')) {
            this.setCapabilityValue('alarm_smoke', alarm);
          }

          // capability gas_concentration
          if (gas_concentration != this.getCapabilityValue('gas_concentration')) {
            this.setCapabilityValue('gas_concentration', gas_concentration);
            Homey.ManagerFlow.getCard('trigger', 'triggerGasConcentration').trigger(this, {'ppm': gas_concentration}, {})
          }

        })
        .catch(error => {
          this.log(error);
          this.setUnavailable(Homey.__('Unreachable'));
          this.pingDevice();

          this.offlineTimeout = setTimeout(() => {
            let offlineTrigger = new Homey.FlowCardTrigger('triggerDeviceOffline');
            offlineTrigger.register().trigger({"device": this.getName(), "device_error": error.toString() });
            return;
          }, 60000 * this.getSetting('offline'));

        })
    }, 1000 * this.getSetting('polling'));
  }

  pingDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          this.setAvailable();
          this.pollDevice();
        })
        .catch(error => {
          this.log('Device is not reachable, pinging every 63 seconds to see if it comes online again.');
        })
    }, 63000);
  }

}

module.exports = ShellyGasDevice;
