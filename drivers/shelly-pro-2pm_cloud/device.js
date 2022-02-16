'use strict';

const Homey = require('homey');
const Device = require('../device_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPro2PMCloudDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [
      'shortpush',
      'longpush'
    ];

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Changed');

    this.setAvailable();

    // TODO: REMOVE AFTER SOME RELEASES AND AFTER GEN HAS BECOME AVAILABLE IN THE INTEGRATOR API CALLBACK
    if (this.getStoreValue('gen') == undefined || this.getStoreValue('gen') == null) {
      this.setStoreValue('gen', 'gen2');
    }

    this.bootSequence();

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("onoff", this.onCapabilityOnoff.bind(this));

  }

}

module.exports = ShellyPro2PMCloudDevice;
