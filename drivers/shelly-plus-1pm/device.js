'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellyPlus1PMDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [
      'single_push',
      'long_push',
      'double_push',
      'btn_down',
      'btn_up'
    ];

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Changed');
    this.homey.flow.getDeviceTriggerCard('triggerInputExternal1On');
    this.homey.flow.getDeviceTriggerCard('triggerInputExternal1Off');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature1');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature2');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature3');

    this.bootSequence();

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("onoff", this.onCapabilityOnoff.bind(this));

  }

}

module.exports = ShellyPlus1PMDevice;
