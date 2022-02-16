'use strict';

const Homey = require('homey');
const Device = require('../device_cloud.js');
const Util = require('../../lib/util.js');

class Shelly4ProCloudDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.setAvailable();

    // TO O: REMOVE AFTER SOME RELEASES AND AFTER GEN HAS BECOME AVAILABLE IN THE INTEGRATOR API CALLBACK
    if (this.getStoreValue('gen') == undefined || this.getStoreValue('gen') == null) {
      if (this.getStoreValue('type').startsWith('SPSW')) {
        this.setStoreValue('gen', 'gen2');
      } else {
        this.setStoreValue('gen', 'gen1');
      }
    }

    this.bootSequence();

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("onoff", this.onCapabilityOnoff.bind(this));

  }

}

module.exports = Shelly4ProCloudDevice;
