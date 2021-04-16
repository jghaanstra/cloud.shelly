'use strict';

const Homey = require('homey');
const Device = require('../device.js');
const Util = require('/lib/util.js');

class ShellyDimmerDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [
      'shortpush_1',
      'longpush_1',
      'shortpush_2',
      'longpush_2'
    ];
    // TODO: REMOVE AFTER 3.1.0
    this.temp_callbacks = [
      'btn1_on',
      'btn1_off',
      'btn2_on',
      'btn2_off',
      'out_on',
      'out_off',
      'btn1_shortpush',
      'btn1_longpush',
      'btn2_shortpush',
      'btn2_longpush'
    ];

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput2On');
    this.homey.flow.getDeviceTriggerCard('triggerInput2Off');
    this.homey.flow.getDeviceTriggerCard('triggerOverpowered');

    // TODO: REMOVE AFTER 3.0.29
    this.setStoreValue('unicast', false);

    // TODO: REMOVE AFTER 3.1.0
    this.homey.flow.getDeviceTriggerCard('triggerInput');

    // TODO: REMOVE AFTER 3.1.0
    this.homey.flow.getDeviceTriggerCard('triggerInput1');

    this.setAvailable();

    if (!this.getStoreValue('sdk') === 3) {
      // TODO: REMOVE AFTER 3.1.0
      if (this.hasCapability('meter_power_wmin')) {
        this.removeCapability('meter_power_wmin');
      }
      if (this.hasCapability('onoff.input1')) {
        this.removeCapability('onoff.input1');
      }
      if (this.hasCapability('onoff.input2')) {
        this.removeCapability('onoff.input2');
      }
      if (this.hasCapability('alarm_generic')) {
        this.removeCapability('alarm_generic');
      }
      if (this.hasCapability('alarm_generic.1')) {
        this.removeCapability('alarm_generic.1');
      }
      if (!this.hasCapability('input_1')) {
        this.addCapability('input_1');
      }
      if (!this.hasCapability('input_2')) {
        this.addCapability('input_2');
      }
      if (this.hasCapability('button.callbackevents')) {
        this.removeCapability('button.callbackevents');
      }
      if (this.hasCapability('button.removecallbackevents')) {
        this.removeCapability('button.removecallbackevents');
      }
      this.setStoreValue("sdk", 3);
    }

    // INITIAL UPDATE AND POLLING
    this.bootSequence();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      const path = value ? '/light/0?turn=on' : '/light/0?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('dim', async (value) => {
      if (!this.getCapabilityValue('onoff')) {
        this.setCapabilityValue('onoff', true);
      }
      const dim = value * 100;
      return await this.util.sendCommand('/light/0?brightness='+ dim +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  // HELPER FUNCTIONS

  // TODO: REMOVE AFTER 3.1.0
  async removeCallbacks() {
    return await this.util.removeCallbackEvents('/settings/actions?index=0&name=', this.temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

}

module.exports = ShellyDimmerDevice;
