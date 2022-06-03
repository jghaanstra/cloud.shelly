'use strict';

const Homey = require('homey');
const Device = require('../device_cloud.js');
const Util = require('../../lib/util.js');

class ShellyVintageCloudDevice extends Device {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.bootSequence();

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("onoff", this.onCapabilityOnoffLight.bind(this));
    this.registerCapabilityListener("dim", this.onCapabilityDim.bind(this));

  }

}

module.exports = ShellyVintageCloudDevice;
