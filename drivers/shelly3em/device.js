'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
  'out_on',
  'out_off'
];

class Shelly3EmDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerMeterPowerConsumed');
    this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned');
    this.homey.flow.getDeviceTriggerCard('triggerMeterPowerFactor');

    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      this.homey.drivers.getDriver('shelly3em').updateTempDevices(this.getData().id, 'onoff', value);
      const path = value ? '/relay/0?turn=on' : '/relay/0?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.callbackevents', async () => {
      return await this.util.addCallbackEvents('/settings/relay/0?', callbacks, 'shelly3em', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await this.util.removeCallbackEvents('/settings/relay/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onAdded() {
    /*setTimeout(async () => {
      if (this.getStoreValue('channel') == 0) {
        return await this.util.addCallbackEvents('/settings/relay/0?', callbacks, 'shelly3em', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        this.homey.drivers.getDriver('shelly3em').loadDevices();
      }
    }, this.getStoreValue('channel') * 2000);*/
    this.homey.drivers.getDriver('shelly3em').loadDevices();
  }

  async onDeleted() {
    try {
      if (this.getStoreValue('channel') == 0) {
        const iconpath = "/userdata/" + this.getData().id +".svg";
        await this.util.removeCallbackEvents('/settings/relay/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await this.util.removeIcon(iconpath);
      }
      this.homey.drivers.getDriver('shelly3em').loadDevices();
      return;
    } catch (error) {
      this.log(error);
    }
  }

  getCallbacks() {
    return callbacks;
  }

}

module.exports = Shelly3EmDevice;
