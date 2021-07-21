'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class Shellyi3Device extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [
      'shortpush_1',
      'longpush_1',
      'double_shortpush_1',
      'triple_shortpush_1',
      'shortpush_longpush_1',
      'longpush_shortpush_1',
      'shortpush_2',
      'longpush_2',
      'double_shortpush_2',
      'triple_shortpush_2',
      'shortpush_longpush_2',
      'longpush_shortpush_2',
      'shortpush_3',
      'longpush_3',
      'double_shortpush_3',
      'triple_shortpush_3',
      'shortpush_longpush_3',
      'longpush_shortpush_3'
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

    this.setAvailable();

    // INITIAL UPDATE AND POLLING
    this.bootSequence();

  }

}

module.exports = Shellyi3Device;
