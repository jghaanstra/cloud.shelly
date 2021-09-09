'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellyRGBW2WhiteDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Changed');
    this.homey.flow.getDeviceTriggerCard('triggerOverpowered');

    this.setAvailable();

    // INITIAL UPDATE AND POLLING
    this.bootSequence();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      const path = value ? '/white/'+ this.getStoreValue("channel") +'?turn=on' : '/white/'+ this.getStoreValue("channel") +'?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('dim', async (value, opts) => {
      if (opts.duration === undefined || typeof opts.duration == 'undefined') {
        opts.duration = '500';
      }
      const dim = value * 100;
      return await this.util.sendCommand('/white/'+ this.getStoreValue('channel') +'?brightness='+ dim +'&transition='+ opts.duration +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

}

module.exports = ShellyRGBW2WhiteDevice;
