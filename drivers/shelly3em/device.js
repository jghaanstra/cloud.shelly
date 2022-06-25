'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class Shelly3EmDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned');
    this.homey.flow.getDeviceTriggerCard('triggerMeterPowerFactor');

    // TODO: REMOVE AFTER SOME RELEASES
    if (!this.hasCapability('meter_power.total')) {
      this.addCapability('meter_power.total');
    }

    this.bootSequence();

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("onoff", this.onCapabilityOnoff.bind(this));

  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.setEnergy({ cumulative: newSettings.cumulative });
  }

}

module.exports = Shelly3EmDevice;
