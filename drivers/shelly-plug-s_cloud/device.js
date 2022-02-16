'use strict';

const Homey = require('homey');
const Device = require('../device_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPlugSCloudDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.setAvailable();

    // TODO: REMOVE AFTER SOME RELEASES AND AFTER GEN HAS BECOME AVAILABLE IN THE INTEGRATOR API CALLBACK
    if (this.getStoreValue('gen') == undefined || this.getStoreValue('gen') == null || this.getStoreValue('gen') == 'gen2') {
      this.setStoreValue('gen', 'gen1');
    }

    this.bootSequence();

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("onoff", this.onCapabilityOnoff.bind(this));

  }


}

module.exports = ShellyPlugSCloudDevice;
