'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellyTRVDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.homey.flow.getDeviceTriggerCard('triggerValvePosition');

    this.setAvailable();

    this.bootSequence();

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("onoff", this.onCapabilityValvePosition.bind(this));
    this.registerCapabilityListener("valve_mode", this.onCapabilityValveMode.bind(this));
    this.registerCapabilityListener("target_temperature", this.onCapabilityTargetTemperature.bind(this));

  }

}

module.exports = ShellyTRVDevice;
