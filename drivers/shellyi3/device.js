'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');
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

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('button.callbackevents', async () => {
      try {
        await util.addCallbackEvents('/settings/input/0?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.addCallbackEvents('/settings/input/1?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.addCallbackEvents('/settings/input/2?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return;
      } catch (error) {
        throw new Error(error);
        this.log(error);
      }
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      try {
        await util.removeCallbackEvents('/settings/input/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.removeCallbackEvents('/settings/input/1?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.removeCallbackEvents('/settings/input/2?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return;
      } catch (error) {
        throw new Error(error);
        this.log(error);
      }
    });

  }

  async onAdded() {
    try {
      await util.addCallbackEvents('/settings/input/0?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.addCallbackEvents('/settings/input/1?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.addCallbackEvents('/settings/input/2?', callbacks, 'shellyi3', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      return;
    } catch (error) {
      throw new Error(error);
      this.log(error);
    }
  }

  async onDeleted() {
    try {
      clearInterval(this.pollingInterval);
      clearInterval(this.pingInterval);
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await util.removeCallbackEvents('/settings/input/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.removeCallbackEvents('/settings/input/1?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.removeCallbackEvents('/settings/input/2?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.removeIcon(iconpath);
      return;
    } catch (error) {
      throw new Error(error);
      this.log(error);
    }
  }

}

module.exports = Shellyi3Device;
