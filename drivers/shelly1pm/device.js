'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class Shelly1pmDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    if (this.getStoreValue('communication') === 'websocket') {
      this.callbacks = [
        'shortpush',
        'longpush'
      ];
    } else {
      this.callbacks = [];
    }

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Changed');
    this.homey.flow.getDeviceTriggerCard('triggerInputExternal1On');
    this.homey.flow.getDeviceTriggerCard('triggerInputExternal1Off');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature1');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature2');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature3');

    this.setAvailable();

    this.bootSequence();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      if (this.getStoreValue('communication') === 'websocket') {
        this.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Switch.Set", "params": {"id": this.getStoreValue('channel'), "on": value} }));
      } else {
        const path = value ? '/relay/0?turn=on' : '/relay/0?turn=off';
        return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

  }

}

module.exports = Shelly1pmDevice;
