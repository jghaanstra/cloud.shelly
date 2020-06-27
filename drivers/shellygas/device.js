'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class ShellyGasDevice extends Homey.Device {

  onInit() {
    new Homey.FlowCardTriggerDevice('triggerGasConcentration').register();

    this.pollDevice();
    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('button.callbackevents', async () => {
      var homeyip = await util.getHomeyIp();
      var alarm_off_url = '/settings/alarm_off_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellygas/'+ this.getData().id +'/alarm_off/';
      var alarm_mild_url = '/settings/alarm_mild_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellygas/'+ this.getData().id +'/alarm_mild/';
      var alarm_heavy_url = '/settings/alarm_heavy_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellygas/'+ this.getData().id +'/alarm_heavy/';

      try {
        await util.sendCommand(alarm_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(alarm_mild_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(alarm_heavy_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return;
      } catch (error) {
        throw new Error(error);
      }
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      var alarm_off_url = '/settings/alarm_off_url=null';
      var alarm_mild_url = '/settings/alarm_mild_url=null';
      var alarm_heavy_url = '/settings/alarm_heavy_url=null';

      try {
        await util.sendCommand(alarm_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(alarm_mild_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(alarm_heavy_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return;
      } catch (error) {
        throw new Error(error);
      }
    });

  }

  onDeleted() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    const iconpath = "/userdata/" + this.getData().id +".svg";
    util.removeIcon(iconpath)
      .catch(error => {
        this.log(error);
      });
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
