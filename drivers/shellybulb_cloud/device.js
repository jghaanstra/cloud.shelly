'use strict';

const Homey = require('homey');
const Device = require('../device_cloud.js');
const Util = require('../../lib/util.js');
const tinycolor = require("tinycolor2");

class ShellyBulbCloudDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.setAvailable();

    // INITIAL UPDATE AND POLLING
    this.bootSequence();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      const onoff = value ? 'on' : 'off';
      return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', command_param: 'turn', command_value: onoff, deviceid: this.getSetting('device_id'), channel: this.getStoreValue('channel')})]);
    });

    this.registerCapabilityListener('dim', async (value) => {
      const dim = value * 100;
      if (this.getCapabilityValue('light_mode') === 'color') {
        return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', command_param: 'gain', command_value: dim, deviceid: this.getSetting('device_id'), channel: this.getStoreValue('channel')})]);
      } else {
        return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', command_param: 'brightness', command_value: dim, deviceid: this.getSetting('device_id'), channel: this.getStoreValue('channel')})]);
      }
    });

    this.registerCapabilityListener('light_temperature', async (value) => {
      const light_temperature = Number(this.util.denormalize(value, 3000, 6500));
      if (this.getCapabilityValue('light_mode') !== 'temperature') {
        await this.triggerCapabilityListener('light_mode', 'temperature');
      }
      return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', command_param: 'temp', command_value: light_temperature, deviceid: this.getSetting('device_id'), channel: this.getStoreValue('channel')})]);
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
      return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest-RGB', command: 'light', command_param: 'rbg', red: Number(rgbcolor.r), green: Number(rgbcolor.g), blue: Number(rgbcolor.b), deviceid: this.getSetting('device_id'), channel: this.getStoreValue('channel')})]);
    }, 500);

    this.registerCapabilityListener('light_mode', async (value) => {
      const light_mode = value === 'temperature' ? 'white' : 'color';
      return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', command_param: 'mode', command_value: light_mode, deviceid: this.getSetting('device_id'), channel: this.getStoreValue('channel')})]);
    });

  }

}

module.exports = ShellyBulbCloudDevice;
