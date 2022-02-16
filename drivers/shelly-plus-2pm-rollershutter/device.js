'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellyPlus2PMRollerShutterDevice extends Device {

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

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("windowcoverings_state", this.onCapabilityWindowcoveringsState.bind(this));
    this.registerCapabilityListener("windowcoverings_set", this.onCapabilityWindowcoveringsSet.bind(this));

  }

}

module.exports = ShellyPlus2PMRollerShutterDevice;
