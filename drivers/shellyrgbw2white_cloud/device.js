'use strict';

const Homey = require('homey');
const Device = require('../device_cloud.js');
const Util = require('../../lib/util.js');

class ShellyRGBW2WhiteCloudDevice extends Device {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Changed');

    // TODO: REMOVE AFTER SOME RELEASES
    if (!this.hasCapability('measure_power.total')) {
      this.addCapability('measure_power.total');
    }

    this.setAvailable();

    this.bootSequence();

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("onoff", this.onCapabilityOnoffLight.bind(this));
    this.registerCapabilityListener("dim", this.onCapabilityDim.bind(this));

  }

}

module.exports = ShellyRGBW2WhiteCloudDevice;
