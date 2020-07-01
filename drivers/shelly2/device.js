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

class Shelly2Device extends Homey.Device {

  onInit() {
    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', (value, opts) => {
      Homey.ManagerDrivers.getDriver('shelly2').updateTempDevices(this.getData().id, 'onoff', value);
      if (value) {
        return util.sendCommand('/relay/'+ this.getStoreValue("channel") +'?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return util.sendCommand('/relay/'+ this.getStoreValue("channel") +'?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

    this.registerCapabilityListener('button.callbackevents', async () => {
      util.addCallbackEvents('/settings/relay/'+ this.getStoreValue("channel") +'?', callbacks, 'shelly2', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          return;
        })
        .catch(error => {
          throw new Error(error);
          this.log(error);
        });
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      util.removeCallbackEvents('/settings/relay/'+ this.getStoreValue("channel") +'?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          return;
        })
        .catch(error => {
          throw new Error(error);
          this.log(error);
        });
    });

    this.registerCapabilityListener('button.callbackevents', async () => {
      return await util.addCallbackEvents('/settings/relay/'+ this.getStoreValue("channel") +'?', callbacks, 'shelly2', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      await util.removeCallbackEvents('/settings/relay/'+ this.getStoreValue("channel") +'?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onDeleted() {
    try {
      await util.removeCallbackEvents('/settings/relay/'+ this.getStoreValue("channel") +'?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      if (this.getStoreValue('channel') == 0) {
        const iconpath = "/userdata/" + this.getData().id +".svg";
        await util.removeIcon(iconpath);
      }
      Homey.ManagerDrivers.getDriver('shelly2').loadDevices();
      return;
    } catch (error) {
      throw new Error(error);
      this.log(error);
    }
  }

  async addCallbackUrls(path, devicetype) {
    try {
      return await util.addCallbackEvents(path, callbacks, devicetype, this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    } catch (error) {
      throw new Error(error);
      this.log(error);
    }
  }

  async removeCallbackUrls(path) {
    try {
      return await util.removeCallbackEvents(path, callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    } catch (error) {
      throw new Error(error);
      this.log(error);
    }
  }

}

module.exports = Shelly2Device;
