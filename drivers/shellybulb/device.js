'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const tinycolor = require("tinycolor2");
const callbacks = [];

class ShellyBulbDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.setAvailable();

    // TODO: REMOVE AFTER 3.1.0
    if (!this.hasCapability('light_mode')) {
      this.addCapability('light_mode');
    }

    // UPDATE INITIAL STATE
    this.initialStateUpdate();

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
      await this.util.sendCommand('/light/0?temp='+ light_temperature +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      return await this.setCapabilityValue('light_mode', 'temperature');
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
      await this.util.sendCommand('/light/0?red='+ Number(rgbcolor.r) +'&green='+ Number(rgbcolor.g) +'&blue='+ Number(rgbcolor.b) +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      return await this.setCapabilityValue('light_mode', 'color');
    }, 500);

    this.registerCapabilityListener('light_mode', async (value) => {
      const light_mode = value === 'temperature' ? 'white' : 'color';
      return await this.util.sendCommand('/settings/?mode='+ light_mode +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onAdded() {
    return await this.homey.app.updateShellyCollection();
  }

  async onDeleted() {
    try {
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await this.util.removeIcon(iconpath);
      await this.homey.app.updateShellyCollection();
      return;
    } catch (error) {
      this.log(error);
    }
  }

  // HELPER FUNCTIONS
  async initialStateUpdate() {
    try {
      let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 'polling');
      if (!this.getAvailable()) { this.setAvailable(); }

      this.setStoreValue('red', result.lights[0].red);
      this.setStoreValue('green', result.lights[0].green);
      this.setStoreValue('blue', result.lights[0].blue);

      let onoff = result.lights[0].ison;
      let light_temperature = 1 - Number(this.util.normalize(result.lights[0].temp, 3000, 6500));
      let color = tinycolor({ r: result.lights[0].red, g: result.lights[0].green, b: result.lights[0].blue });
      let hsv = color.toHsv();
      let light_hue = Number((hsv.h / 360).toFixed(2));
      let light_mode = result.mode === 'white' ? 'temperature' : 'color';
      if (light_mode === 'color') {
        var dim = result.lights[0].gain / 100;
      } else {
        var dim = result.lights[0].brightness / 100;
      }

      // capability onoff
      if (onoff != this.getCapabilityValue('onoff')) {
        this.setCapabilityValue('onoff', onoff);
      }

      // capability dim
      if (dim != this.getCapabilityValue('dim')) {
        this.setCapabilityValue('dim', dim);
      }

      // capability light_temperature
      if (light_temperature != this.getCapabilityValue('light_temperature')) {
        this.setCapabilityValue('light_temperature', light_temperature);
      }

      // capability light_hue
      if (light_hue != this.getCapabilityValue('light_hue')) {
        this.setCapabilityValue('light_hue', light_hue);
      }

      // capability light_saturation
      if (hsv.s != this.getCapabilityValue('light_saturation')) {
        this.setCapabilityValue('light_saturation', hsv.s);
      }

      // capability light_mode
      if (light_mode != this.getCapabilityValue('light_mode')) {
        this.setCapabilityValue('light_mode', light_mode);
      }

    } catch (error) {
      this.setUnavailable(this.homey.__('device.unreachable') + error.message);
      this.log(error);
    }
  }

  async deviceCoapReport(capability, value) {
    try {
      if (!this.getAvailable()) { this.setAvailable(); }

      switch(capability) {
        case 'switch':
          if (value != this.getCapabilityValue('onoff')) {
            this.setCapabilityValue('onoff', value);
          }
          break;
        case 'colorTemperature':
          let light_temperature = 1 - Number(this.util.normalize(value, 3000, 6500));
          if (light_temperature != this.getCapabilityValue('light_temperature')) {
            this.setCapabilityValue('light_temperature', light_temperature);
          }
          break;
        case 'gain':
        case 'brightness':
          let dim = value >= 100 ? 1 : value / 100;
          if (dim != this.getCapabilityValue('dim')) {
            this.setCapabilityValue('dim', dim);
          }
          break;
        case 'red':
          this.setStoreValue('red', value);
          this.updateDeviceRgb();
          break;
        case 'green':
          this.setStoreValue('green', value);
          this.updateDeviceRgb();
          break;
        case 'blue':
          this.setStoreValue('blue', value);
          this.updateDeviceRgb();
          break;
        case 'mode':
          let light_mode = value === 'white' ? 'temperature' : 'color';
          if (light_mode != this.getCapabilityValue('light_mode')) {
            this.setCapabilityValue('light_mode', light_mode);
          }
          break;
        default:
          //this.log('Device does not support reported capability '+ capability +' with value '+ value);
      }
      return Promise.resolve(true);
    } catch(error) {
      this.log(error);
      return Promise.reject(error);
    }
  }

  updateDeviceRgb() {
    clearTimeout(this.updateDeviceRgbTimeout);

    this.updateDeviceRgbTimeout = setTimeout(() => {
      let color = tinycolor({ r: this.getStoreValue('red'), g: this.getStoreValue('green'), b: this.getStoreValue('blue') });
      let hsv = color.toHsv();
      let light_hue = Number((hsv.h / 360).toFixed(2));
      if (light_hue !== this.getCapabilityValue('light_hue')) {
        this.setCapabilityValue('light_hue', light_hue);
      }
      if (hsv.v !== this.getCapabilityValue('light_saturation')) {
        this.setCapabilityValue('light_saturation', hsv.v);
      }
    }, 2000);
  }

  getCallbacks() {
    return callbacks;
  }

}

module.exports = ShellyBulbDevice;
