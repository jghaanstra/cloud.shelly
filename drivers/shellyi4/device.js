'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class Shellyi4Device extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [
      'single_push_1',
      'long_push_1',
      'double_push_1',
      'btn_down_1',
      'btn_up_1',
      'single_push_2',
      'long_push_2',
      'double_push_2',
      'btn_down_2',
      'btn_up_2',
      'single_push_3',
      'long_push_3',
      'double_push_3',
      'btn_down_3',
      'btn_up_3',
      'single_push_4',
      'long_push_4',
      'double_push_4',
      'btn_down_4',
      'btn_up_4',
    ];

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Changed');
    this.homey.flow.getDeviceTriggerCard('triggerInput2On');
    this.homey.flow.getDeviceTriggerCard('triggerInput2Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput2Changed');
    this.homey.flow.getDeviceTriggerCard('triggerInput3On');
    this.homey.flow.getDeviceTriggerCard('triggerInput3Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput3Changed');
    this.homey.flow.getDeviceTriggerCard('triggerInput4On');
    this.homey.flow.getDeviceTriggerCard('triggerInput4Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput4Changed');

    this.bootSequence();

  }

}

module.exports = Shellyi4Device;
