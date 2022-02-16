'use strict';

const Homey = require('homey');
const Device = require('../device_cloud.js');
const Util = require('../../lib/util.js');

class ShellyDimmerCloudDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [
      'shortpush_1',
      'longpush_1',
      'shortpush_2',
      'longpush_2'
    ];

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Changed');
    this.homey.flow.getDeviceTriggerCard('triggerInput2On');
    this.homey.flow.getDeviceTriggerCard('triggerInput2Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput2Changed');

    this.setAvailable();

    // TODO: REMOVE AFTER SOME RELEASES AND AFTER GEN HAS BECOME AVAILABLE IN THE INTEGRATOR API CALLBACK
    if (this.getStoreValue('gen') == undefined || this.getStoreValue('gen') == null || this.getStoreValue('gen') == 'gen2') {
      this.setStoreValue('gen', 'gen1');
    }

    this.bootSequence();

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("onoff", this.onCapabilityOnoffLight.bind(this));
    this.registerCapabilityListener("dim", this.onCapabilityDim.bind(this));

  }

}

module.exports = ShellyDimmerCloudDevice;
