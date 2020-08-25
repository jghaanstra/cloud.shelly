'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
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
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerMeterPowerFactor');
    this.homey.flow.getDeviceTriggerCard('triggerMeterPowerWmin');

    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      this.homey.drivers.getDriver('shelly25').updateTempDevices(this.getData().id, 'onoff', value);
      const path = value ? '/relay/'+ this.getStoreValue("channel") +'?turn=on' : '/relay/'+ this.getStoreValue("channel") +'?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.callbackevents', async () => {
      return await this.util.addCallbackEvents('/settings/relay/'+ this.getStoreValue("channel") +'?', callbacks, 'shelly25', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await this.util.removeCallbackEvents('/settings/relay/'+ this.getStoreValue("channel") +'?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onAdded() {
    /*setTimeout(async () => {
      return await this.util.addCallbackEvents('/settings/relay/'+ this.getStoreValue("channel") +'?', callbacks, 'shelly25', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      if (this.getStoreValue('channel') == 0) {
        this.homey.drivers.getDriver('shelly25').loadDevices();
      }
    }, this.getStoreValue('channel') * 2000);*/
    this.homey.drivers.getDriver('shelly25').loadDevices();
  }

  async onDeleted() {
    try {
      await this.util.removeCallbackEvents('/settings/relay/'+ this.getStoreValue("channel") +'?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      if (this.getStoreValue('channel') == 0) {
        const iconpath = "/userdata/" + this.getData().id +".svg";
        await this.util.removeIcon(iconpath);
      }
      this.homey.drivers.getDriver('shelly25').loadDevices();
      return;
    } catch (error) {
      this.log(error);
    }
  }

  getCallbacks() {
    return callbacks;
  }

}

module.exports = Shelly25Device;
