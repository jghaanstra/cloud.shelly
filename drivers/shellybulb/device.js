'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');
const tinycolor = require("tinycolor2");

class ShellyBulbDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.setAvailable();

    this.bootSequence();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      const path = value ? '/light/0?turn=on' : '/light/0?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('dim', async (value) => {
      const dim = value * 100;
      if (this.getCapabilityValue('light_mode') === 'color') {
        return await this.util.sendCommand('/light/0?gain='+ dim +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return await this.util.sendCommand('/light/0?brightness='+ dim +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

    this.registerCapabilityListener('light_temperature', async (value) => {
      const light_temperature = Number(this.util.denormalize(value, 3000, 6500));
      if (this.getCapabilityValue('light_mode') !== 'temperature') {
        await this.triggerCapabilityListener('light_mode', 'temperature');
      }
      return await this.util.sendCommand('/light/0?temp='+ light_temperature +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
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
      const color = tinycolor.fromRatio({ h: hue_value, s: saturation_value, v: this.getCapabilityValue('dim') });
      const rgbcolor = color.toRgb();
      if (this.getCapabilityValue('light_mode') !== 'color') {
        await this.triggerCapabilityListener('light_mode', 'color');
      }
      return await this.util.sendCommand('/light/0?red='+ Number(rgbcolor.r) +'&green='+ Number(rgbcolor.g) +'&blue='+ Number(rgbcolor.b) +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    }, 500);

    this.registerCapabilityListener('light_mode', async (value) => {
      const light_mode = value === 'temperature' ? 'white' : 'color';
      return await this.util.sendCommand('/settings/?mode='+ light_mode +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

}

module.exports = ShellyBulbDevice;
