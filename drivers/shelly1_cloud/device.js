'use strict';

const Homey = require('homey');
const Device = require('../device_cloud.js');
const Util = require('../../lib/util.js');

class Shelly1CloudDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Changed');
    this.homey.flow.getDeviceTriggerCard('triggerInputExternal1On');
    this.homey.flow.getDeviceTriggerCard('triggerInputExternal1Off');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature1');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature2');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature3');

    this.setAvailable();

    // TODO: REMOVE AFTER SOME RELEASES AND AFTER GEN HAS BECOME AVAILABLE IN THE INTEGRATOR API CALLBACK
    if (this.getStoreValue('gen') == undefined || this.getStoreValue('gen') == null) {
      if (this.getStoreValue('type').startsWith('SNSW')) {
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

module.exports = Shelly1CloudDevice;
