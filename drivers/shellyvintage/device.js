'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellyVintageDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.setAvailable();

    // INITIAL UPDATE AND POLLING
    this.bootSequence();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      const path = value ? '/light/0?turn=on' : '/light/0?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('dim', async (value) => {
      if (opts.duration === undefined || typeof opts.duration == 'undefined') {
        opts.duration = '500';
      }
      const dim = value * 100;
      return await this.util.sendCommand('/light/0?brightness='+ dim +'&transition='+ opts.duration +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

}

module.exports = ShellyVintageDevice;
