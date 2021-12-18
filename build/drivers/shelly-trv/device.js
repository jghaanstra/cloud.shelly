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

    // INITIAL UPDATE AND POLLING
    this.bootSequence();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('valve_position', async (value) => {
      return await this.util.sendCommand('/thermostat/0?pos='+ value, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('valve_mode', async (value) => {
      if (value === "0") {
        return await this.util.sendCommand('/thermostat/0?schedule=false', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return await this.util.sendCommand('/thermostat/0?schedule=true&schedule_profile='+ value, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

    this.registerCapabilityListener('target_temperature', async (value) => {
      return await this.util.sendCommand('/thermostat/0?target_t_enabled=true&target_t='+ value, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

}

module.exports = ShellyTRVDevice;
