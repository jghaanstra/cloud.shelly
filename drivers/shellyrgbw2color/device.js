'use strict';

const Homey = require('homey');
const Device = require('../device.js');
const Util = require('/lib/util.js');
const tinycolor = require("tinycolor2");

class ShellyRGBW2ColorDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [
      'longpush',
      'shortpush'
    ];
    // TODO: REMOVE AFTER 3.1.0
    this.temp_callbacks = [
      'btn_on',
      'btn_off',
      'btn_longpush',
      'btn_shortpush',
      'out_on',
      'out_off'
    ];

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerOverpowered');

    // TODO: REMOVE AFTER 3.1.0
    this.homey.flow.getDeviceTriggerCard('triggerInput');

    this.setAvailable();

    if (!this.getStoreValue('sdk') === 3) {
      // TODO: REMOVE AFTER 3.1.0
      if (!this.hasCapability('meter_power')) {
        this.addCapability('meter_power');
      }
      if (this.hasCapability('alarm_generic')) {
        this.removeCapability('alarm_generic');
      }
      if (!this.hasCapability('input_1')) {
        this.addCapability('input_1');
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
      const path = value ? '/color/0?turn=on' : '/color/0?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('dim', async (value) => {
      const dim = value * 100;
      return await this.util.sendCommand('/color/0?gain='+ dim +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('light_temperature', async (value) => {
      const white = Number(this.util.denormalize(value, 0, 255));
      await this.setCapabilityValue('light_mode', 'temperature');
      return await this.util.sendCommand('/color/0?white='+ white, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerMultipleCapabilityListener(['light_hue', 'light_saturation' ], async ( valueObj, optsObj ) => {
      if (typeof valueObj.light_hue !== 'undefined') {
        var hue_value = valueObj.light_hue;
      } else {
        var hue_value = this.getCapabilityValue('light_hue');
      }
      if (typeof valueObj.light_saturation !== 'undefined') {
        var saturation_value = valueObj.light_saturation;
      } else {
        var saturation_value = this.getCapabilityValue('light_saturation');
      }
      let color = tinycolor.fromRatio({ h: hue_value, s: saturation_value, v: this.getCapabilityValue('dim') });
      let rgbcolor = color.toRgb();
      await this.setCapabilityValue('light_mode', 'color');
      return await this.util.sendCommand('/color/0?red='+ Number(rgbcolor.r) +'&green='+ Number(rgbcolor.g) +'&blue='+ Number(rgbcolor.b) +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    }, 500);

    this.registerCapabilityListener('onoff.whitemode', async (value) => {
      if (value) {
        this.setCapabilityValue('light_mode', 'temperature');
        return await this.util.sendCommand('/color/0?gain=0&white=255', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        this.setCapabilityValue("light_mode", 'color');
        return await this.util.sendCommand('/color/0?gain=100&white=0', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

  }

  // HELPER FUNCTIONS

  // TODO: REMOVE AFTER 3.1.0
  async removeCallbacks() {
    return await this.util.removeCallbackEvents('/settings/actions?index=0&name=', this.temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

}

module.exports = ShellyRGBW2ColorDevice;
