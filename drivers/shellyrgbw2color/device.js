'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const tinycolor = require("tinycolor2");
const callbacks = [
  'longpush',
  'shortpush'
];
// TODO: REMOVE AFTER 3.1.0
const temp_callbacks = [
  'btn_on',
  'btn_off',
  'btn_longpush',
  'btn_shortpush',
  'out_on',
  'out_off'
];

class ShellyRGBW2ColorDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerOverpowered');

    this.setAvailable();

    // ADD OR REMOVE CAPABILITIES
    // TODO: REMOVE AFTER 3.1.0
    if (!this.hasCapability('meter_power')) {
      this.addCapability('meter_power');
    }
    if (!this.hasCapability('alarm_generic')) {
      this.addCapability('alarm_generic');
    }
    if (this.hasCapability('button.callbackevents')) {
      this.removeCapability('button.callbackevents');
    }
    if (this.hasCapability('button.removecallbackevents')) {
      this.removeCapability('button.removecallbackevents');
    }

    // UPDATE INITIAL STATE
    this.initialStateUpdate();

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
      this.setCapabilityValue("light_mode", 'temperature');
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
      this.setCapabilityValue("light_mode", 'color');
      return await this.util.sendCommand('/color/0?red='+ Number(rgbcolor.r) +'&green='+ Number(rgbcolor.g) +'&blue='+ Number(rgbcolor.b) +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    }, 500);

    this.registerCapabilityListener('onoff.whitemode', async (value) => {
      if (value) {
        this.setCapabilityValue("light_mode", 'temperature');
        return await this.util.sendCommand('/color/0?gain=0&white=255', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        this.setCapabilityValue("light_mode", 'color');
        return await this.util.sendCommand('/color/0?gain=100&white=0', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
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

      let onoff = result.lights[0].ison;
      let dim = result.lights[0].gain / 100;
      let light_temperature = 1 - Number(this.util.normalize(result.lights[0].white, 0, 255));
      let color = tinycolor({r: result.lights[0].red, g: result.lights[0].green, b: result.lights[0].blue});
      let hsv = color.toHsv();
      let light_hue = Number((hsv.h / 360).toFixed(2));
      let measure_power = result.meters[0].power;
      let meter_power = result.meters[0].total * 0.000017;
      let alarm_generic = result.inputs[0].input === 1 ? true : false;

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

      // capability measure_power
      if (measure_power != this.getCapabilityValue('measure_power')) {
        this.setCapabilityValue('measure_power', measure_power);
      }

      // capability meter_power
      if (meter_power != this.getCapabilityValue('meter_power')) {
        this.setCapabilityValue('meter_power', meter_power);
      }

      // capability alarm_generic
      if (alarm_generic != this.getCapabilityValue('alarm_generic')) {
        this.setCapabilityValue('alarm_generic', alarm_generic);
      }

      //capability white_mode
      if (Number(result.white) > 220 && !this.getCapabilityValue('onoff.whitemode')) {
        this.setCapabilityValue('onoff.whitemode', true);
        this.setCapabilityValue('light_mode', 'temperature');
      } else if (Number(result.gain) >= 0 && Number(result.white) <= 220 && this.getCapabilityValue('onoff.whitemode')) {
        this.setCapabilityValue('onoff.whitemode', false);
        this.setCapabilityValue('light_mode', 'color');
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
        case 'white':
          let light_temperature = 1 - Number(this.util.normalize(value, 0, 255));
          if (light_temperature != this.getCapabilityValue('light_temperature')) {
            this.setCapabilityValue('light_temperature', light_temperature);
          }
          if (value > 220 && !this.getCapabilityValue('onoff.whitemode')) {
            this.setCapabilityValue('onoff.whitemode', true);
            this.setCapabilityValue('light_mode', 'temperature');
          } else if (value >= 0 && value <= 220 && this.getCapabilityValue('onoff.whitemode')) {
            this.setCapabilityValue('onoff.whitemode', false);
            this.setCapabilityValue('light_mode', 'color');
          }
          break;
        case 'gain':
          let dim = value >= 100 ? 1 : value / 100;
          if (dim != this.getCapabilityValue('dim')) {
            this.setCapabilityValue('dim', dim);
          }
          break;
        case 'power0':
          if (value != this.getCapabilityValue('measure_power')) {
            this.setCapabilityValue('measure_power', value);
          }
          break;
        case 'energyCounter0':
          let meter_power = value * 0.000017;
          if (meter_power != this.getCapabilityValue('meter_power')) {
            this.setCapabilityValue('meter_power', meter_power);
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
        case 'input0':
          let alarm = value === 0 ? false : true;
          if (alarm != this.getCapabilityValue('alarm_generic')) {
            this.setCapabilityValue('alarm_generic', alarm);
          }
          break;
        case 'inputEvent0':
          let actionEvent = this.util.getActionEventDescription(value);
          this.setStoreValue('actionEvent', actionEvent);
          break;
        case 'inputEventCounter0':
          if (value > 0) {
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')});
          }
          break;
        case 'overPower':
          if (value) {
            this.homey.flow.getDeviceTriggerCard('triggerOverpowered').trigger(this, {}, {});
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

  // TODO: REMOVE AFTER 3.1.0
  async removeCallbacks() {
    return await this.util.removeCallbackEvents('/settings/actions?index=0&name=', temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

}

module.exports = ShellyRGBW2ColorDevice;
