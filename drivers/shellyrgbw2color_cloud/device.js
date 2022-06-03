'use strict';

const Homey = require('homey');
const Device = require('../device_cloud.js');
const Util = require('../../lib/util.js');
const tinycolor = require("tinycolor2");

class ShellyRGBW2ColorCloudDevice extends Device {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [
      'longpush',
      'shortpush'
    ];

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Changed');

    this.bootSequence();

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("onoff", this.onCapabilityOnoffLight.bind(this));

    this.registerCapabilityListener('dim', async (value) => {
      if (!this.getCapabilityValue('onoff')) {
        this.setCapabilityValue('onoff', true);
      }
      const dim = value === 0 ? 1 : value * 100;
      return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', command_param: 'gain', command_value: dim, deviceid: this.getSetting('cloud_device_id'), channel: this.getStoreValue('channel')})]);
    });

    this.registerCapabilityListener('light_temperature', async (value) => {
      const white = Number(this.util.denormalize(value, 0, 255));
      await this.setCapabilityValue('light_mode', 'temperature');

      if (white > 125 && !this.getCapabilityValue('onoff.whitemode')) {
        this.updateCapabilityValue('onoff.whitemode', true);
      } else if (white <= 125 && this.getCapabilityValue('onoff.whitemode')) {
        this.updateCapabilityValue('onoff.whitemode', false);
      }

      return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', command_param: 'white', command_value: white, deviceid: this.getSetting('cloud_device_id'), channel: this.getStoreValue('channel')})]);
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
      return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest-RGB', command: 'light', command_param: 'rbg', red: Number(rgbcolor.r), green: Number(rgbcolor.g), blue: Number(rgbcolor.b), deviceid: this.getSetting('cloud_device_id'), channel: this.getStoreValue('channel')})]);
    }, 500);

    this.registerCapabilityListener('onoff.whitemode', async (value) => {
      if (value) {
        this.setCapabilityValue('light_mode', 'temperature');
        return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', gain: 0, white: 255, command_value: white, deviceid: this.getSetting('cloud_device_id'), channel: this.getStoreValue('channel')})]);
      } else {
        this.setCapabilityValue("light_mode", 'color');
        return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', gain: 100, white: 0, command_value: white, deviceid: this.getSetting('cloud_device_id'), channel: this.getStoreValue('channel')})]);
      }
    });

    this.registerCapabilityListener('light_mode', async (value) => {

    });

  }

}

module.exports = ShellyRGBW2ColorCloudDevice;
