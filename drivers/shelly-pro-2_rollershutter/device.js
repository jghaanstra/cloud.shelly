'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellyPro2RollerShutterDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Changed');
    this.homey.flow.getDeviceTriggerCard('triggerInput2On');
    this.homey.flow.getDeviceTriggerCard('triggerInput2Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput2Changed');

    this.setAvailable();

    this.bootSequence();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('windowcoverings_state', async (value) => {
      if (value !== 'idle' && value !== this.getStoreValue('last_action')) {
        this.setStoreValue('last_action', value);
      }

      if (value == 'idle') {
        return await this.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Cover.Stop", "params": {"id": this.getStoreValue('channel')} }));
      } else if (value == 'up') {
        return await this.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Cover.Open", "params": {"id": this.getStoreValue('channel')} }));
      } else if (value == 'down') {
        return await this.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Cover.Close", "params": {"id": this.getStoreValue('channel')} }));
      } else {
        return Promise.reject('State not recognized ...');
      }
    });

    this.registerCapabilityListener('windowcoverings_set', async (value) => {
      try {
        this.setStoreValue('previous_position', this.getCapabilityValue('windowcoverings_set'));
        return await this.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Cover.GoToPosition", "params": {"id": this.getStoreValue('channel'), "pos": Math.round(value*100)} }));
      } catch (error) {
        return Promise.reject(error);
      }
    });

  }

}

module.exports = ShellyPro2RollerShutterDevice;
