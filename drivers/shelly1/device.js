'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class Shelly1Device extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    if (this.getStoreValue('communication') === 'websocket') {
      this.callbacks = [
        'shortpush',
        'longpush'
      ];
    } else {
      this.callbacks = [];
    }

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Changed');
    this.homey.flow.getDeviceTriggerCard('triggerInputExternal1On');
    this.homey.flow.getDeviceTriggerCard('triggerInputExternal1Off');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature1');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature2');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature3');

    // ADD DEVICE TEMPERATURE WHEN AVAILABLE
    if (this.getStoreValue('communication') === 'websocket' && !this.hasCapability('measure_temperature')) {
      this.addCapability('measure_temperature');
    }

    this.setAvailable();

    // TODO: REMOVE THIS AFTER SOME RELEASES
    this.setStoreValue('gen', 'gen1');
    this.setStoreValue('communication', 'coap');
    this.setStoreValue('channel', 0);

    this.bootSequence();

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("onoff", this.onCapabilityOnoff.bind(this));

  }

}

module.exports = Shelly1Device;
