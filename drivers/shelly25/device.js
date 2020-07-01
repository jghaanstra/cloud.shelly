'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');
const callbacks = [
  'btn_on',
  'btn_off',
  'out_on',
  'out_off',
  'shortpush',
  'longpush'
];

class Shelly25Device extends Homey.Device {

  onInit() {
    new Homey.FlowCardTriggerDevice('triggerMeterPowerFactor').register();
    new Homey.FlowCardTriggerDevice('triggerMeterPowerWmin').register();

    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', (value, opts) => {
      Homey.ManagerDrivers.getDriver('shelly25').updateTempDevices(this.getData().id, 'onoff', value);
      if (value) {
        return util.sendCommand('/relay/'+ this.getStoreValue('channel') +'?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return util.sendCommand('/relay/'+ this.getStoreValue('channel') +'?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

    this.registerCapabilityListener('button.callbackevents', async () => {
      return await util.addCallbackEvents('/settings/relay/'+ this.getStoreValue("channel") +'?', callbacks, 'shelly25', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await util.removeCallbackEvents('/settings/relay/'+ this.getStoreValue("channel") +'?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onDeleted() {
    try {
      await util.removeCallbackEvents('/settings/relay/'+ this.getStoreValue("channel") +'?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      if (this.getStoreValue('channel') == 0) {
        const iconpath = "/userdata/" + this.getData().id +".svg";
        await util.removeIcon(iconpath);
      }
      Homey.ManagerDrivers.getDriver('shelly25').loadDevices();
      return;
    } catch (error) {
      throw new Error(error);
      this.log(error);
    }
  }

}

module.exports = Shelly25Device;
