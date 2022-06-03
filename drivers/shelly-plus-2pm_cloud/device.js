'use strict';

const Homey = require('homey');
const Device = require('../device_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPlus2PMCloudDevice extends Device {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [
      'single_push',
      'long_push',
      'double_push'
    ];

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Changed');

    this.bootSequence();

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("onoff", this.onCapabilityOnoff.bind(this));

  }

}

module.exports = ShellyPlus2PMCloudDevice;
