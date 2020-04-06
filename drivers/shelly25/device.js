'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class Shelly25Device extends Homey.Device {

  onInit() {
    new Homey.FlowCardTriggerDevice('triggerMeterPowerFactor').register();
    new Homey.FlowCardTriggerDevice('triggerBtnAction').register();
    new Homey.FlowCardTriggerDevice('triggerMeterPowerWmin').register();

    this.setAvailable();

    // ADD MISSING CAPABILITIES
    if (!this.hasCapability('button.triggers')) {
      this.addCapability('button.triggers');
    }
    if (!this.hasCapability('button.removetriggers')) {
      this.addCapability('button.removetriggers');
    }

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', (value, opts) => {
      Homey.ManagerDrivers.getDriver('shelly25').updateTempDevices(this.getData().id, 'onoff', value);
      if (value) {
        return util.sendCommand('/relay/'+ this.getStoreValue('channel') +'?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return util.sendCommand('/relay/'+ this.getStoreValue('channel') +'?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

    this.registerCapabilityListener('button.triggers', async () => {
      var homeyip = await util.getHomeyIp();
      var btn_on_url = '/settings/relay/'+ this.getStoreValue('channel') +'?btn_on_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shelly25/'+ this.getData().id +'/btn_on/';
      var btn_off_url = '/settings/relay/'+ this.getStoreValue('channel') +'?btn_off_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shelly25/'+ this.getData().id +'/btn_off/';
      var out_on_url = '/settings/relay/'+ this.getStoreValue('channel') +'?out_on_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shelly25/'+ this.getData().id +'/out_on/';
      var out_off_url = '/settings/relay/'+ this.getStoreValue('channel') +'?out_off_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shelly25/'+ this.getData().id +'/out_off/';
      var shortpush_url = '/settings/relay/'+ this.getStoreValue('channel') +'?shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shelly25/'+ this.getData().id +'/shortpush/';
      var longpush_url = '/settings/relay/'+ this.getStoreValue('channel') +'?longpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shelly25/'+ this.getData().id +'/longpush/';

      try {
        await util.sendCommand(btn_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(out_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(out_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(shortpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(longpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return;
      } catch (error) {
        throw new Error(error);
      }
    });

    this.registerCapabilityListener('button.removetriggers', async () => {
      var btn_on_url = '/settings/relay/'+ this.getStoreValue('channel') +'?btn_on_url=null';
      var btn_off_url = '/settings/relay/'+ this.getStoreValue('channel') +'?btn_off_url=null';
      var out_on_url = '/settings/relay/'+ this.getStoreValue('channel') +'?out_on_url=null';
      var out_off_url = '/settings/relay/'+ this.getStoreValue('channel') +'?out_off_url=null';
      var shortpush_url = '/settings/relay/'+ this.getStoreValue('channel') +'?shortpush_url=null';
      var longpush_url = '/settings/relay/'+ this.getStoreValue('channel') +'?longpush_url=null';

      try {
        await util.sendCommand(btn_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(out_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(out_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(shortpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(longpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return;
      } catch (error) {
        throw new Error(error);
      }
    });

  }

  onDeleted() {
    return Homey.ManagerDrivers.getDriver('shelly25').loadDevices();
  }

  triggerActions(action) {
    return Homey.ManagerFlow.getCard('trigger', "triggerBtnAction").trigger(this, {"action": action}, {})
  }

}

module.exports = Shelly25Device;
