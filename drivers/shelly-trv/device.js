'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellyTRVDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.homey.flow.getDeviceTriggerCard('triggerValvePosition');

    this.bootSequence();

    // REFRESHING DEVICE CONFIG AND REGISTERING DEVICE TRIGGER CARDS
    this.homey.setTimeout(async () => {
      try {
        await this.updateDeviceConfig();
      } catch (error) {
        this.log(error);
      }
    }, 2000);

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("valve_position", this.onCapabilityValvePosition.bind(this));
    this.registerCapabilityListener("valve_mode", this.onCapabilityValveMode.bind(this));
    this.registerCapabilityListener("target_temperature", this.onCapabilityTargetTemperature.bind(this));

  }

}

module.exports = ShellyTRVDevice;
