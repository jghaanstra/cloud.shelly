'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
  'btn_on',
  'btn_off',
  'shortpush',
  'longpush',
  'double_shortpush',
  'double_longpush',
  'triple_shortpush',
  'triple_longpush',
  'shortpush_longpush',
  'longpush_shortpush'
];

class Shellyi3Device extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('button.callbackevents', async () => {
      try {
        await this.util.addCallbackEvents('/settings/input/0?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 1);
        await this.util.addCallbackEvents('/settings/input/1?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 2);
        await this.util.addCallbackEvents('/settings/input/2?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 3);
        return Promise.resolve(true);
      } catch (error) {
        this.log(error);
        return Promise.resolve(error);
      }
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      try {
        await this.util.removeCallbackEvents('/settings/input/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await this.util.removeCallbackEvents('/settings/input/1?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await this.util.removeCallbackEvents('/settings/input/2?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return Promise.resolve(true);
      } catch (error) {
        this.log(error);
        return Promise.resolve(error);
      }
    });

  }

  async onAdded() {
    try {
      await this.util.addCallbackEvents('/settings/input/0?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 1);
      await this.util.addCallbackEvents('/settings/input/1?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 2);
      await this.util.addCallbackEvents('/settings/input/2?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 3);
      return Promise.resolve(true);
    } catch (error) {
      this.log(error);
      return Promise.resolve(error);
    }
  }

  async onDeleted() {
    try {
      clearInterval(this.pollingInterval);
      clearInterval(this.pingInterval);
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await this.util.removeCallbackEvents('/settings/input/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await this.util.removeCallbackEvents('/settings/input/1?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await this.util.removeCallbackEvents('/settings/input/2?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await this.util.removeIcon(iconpath);
      return Promise.resolve(true);
    } catch (error) {
      this.log(error);
      return Promise.resolve(error);
    }
  }

  getCallbacks() {
    return callbacks;
  }

}

module.exports = Shellyi3Device;
