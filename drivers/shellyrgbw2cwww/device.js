'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const tinycolor = require("tinycolor2");
const queryparams = 'red green blue white gain turn'.split(' ');

class ShellyRGBW2CWWWDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.pollDevice();
    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      var params = {};
      if (this.getStoreValue('single')) {
        // Single mode: simply switch on/off
        params.turn = value ? 'on' : 'off';
      } else {
        // Dual mode: simulate on/off using RGBW values
        if (value) {
          // Get the pre-switch-off values for this channel (or defaults if not available)
          var prev = this.getStoreValue('prev') || { dim: 0.1, temperature: 0.5 };
          params = this.getChannelParams(prev.dim, prev.temperature);
        } else {
          var temperature = this.getCapabilityValue('light_temperature');
          params = this.getChannelParams(0, temperature);
          // Store pre-switch-off values for later use
          this.setStoreValue('prev', { dim: this.getCapabilityValue('dim'), temperature: temperature });
        }
      }
      return await this.sendCommand(params);
    });

    this.registerCapabilityListener('dim', async (value) => {
      var params;
      if (this.getStoreValue('single')) {
        // Single mode: simply use gain. However, gain does not affect white (channel 1 warm),
        // so take the two-channel mode green (channel 0 warm) value
        params = {
          gain: value * 100,
          white: this.getChannelParams(value, this.getCapabilityValue('light_temperature')).green
        };
      } else {
        // Dual mode: simulate dim using RGBW values
        params = this.getChannelParams(value, this.getCapabilityValue('light_temperature'));
      }
      return await this.sendCommand(params);
    });

    this.registerCapabilityListener('light_temperature', async (value) => {
      var params;
      // Simulate temperature by mixing R/G and B/W values
      if (this.getStoreValue('single')) {
        params = {};
        params.red = params.blue = this.util.denormalize(value, 0, 255);
        params.green = 255 - params.red;
        // Gain does not affect white, so dim the value
        params.white = params.green * this.getCapabilityValue('dim');
      } else {
        params = this.getChannelParams(this.getCapabilityValue('dim'), value);
      }
      return await this.sendCommand(params);
    });

  }

  onDeleted() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);
  }

  // HELPER FUNCTIONS

  // Calculates RGBW values for simulating dim / temperature combinations
  getChannelParams(dim, temperature) {
    var cool_normalized = temperature < 0.5 ? 0 : (temperature - 0.5) * 2;
    var warm_normalized = temperature > 0.5 ? 0 : (0.5 - temperature) * 2;

    var cool = Number((this.denormalize(cool_normalized, 0, 255) * dim).toFixed(0));
    var warm = Number((this.denormalize(warm_normalized, 0, 255) * dim).toFixed(0));

    var params = { gain: 100 };
    if (this.getStoreValue('channel') === 0) {
      params.red = cool;
      params.green = warm;
    } else {
      params.blue = cool;
      params.white = warm;
    }

    return params;
  }

  async sendCommand(params) {
    var querystring = '';
    queryparams.forEach((p) => {
      if (typeof params[p] === 'number' || typeof params[p] === 'string') querystring += '&' + p + '=' + params[p];
    });
    return await this.util.sendCommand('/color/0?' + querystring, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

  pollDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(async () => {
      try {
        let result = await this.util.sendCommand('/color/0', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        clearTimeout(this.offlineTimeout);

        var single = this.getStoreValue('single');
        var channel = this.getStoreValue('channel');

        // Map RGBW values back to Homey capability values
        var cold = result[single || channel === 0 ? 'red' : 'blue'];
        var warm = result[single || channel === 0 ? 'green' : 'white'];
        var max = Math.max(cold, warm);
        var state;
        if (single) {
          state = {
            ison:         result.ison,
            dim:          result.gain / 100,
            temperature:  (((warm - cold) / max) + 1) / 2,
            power:        result.power
          };
        } else {
          state = {
            ison:         result.ison ? result.gain > 0 && cold + warm > 0 : false,
            dim:          (result.gain / 100) * max / 255,
            temperature:  (((warm - cold) / max) + 1) / 2,
            power:        ((warm + cold) / (result.red + result.green + result.blue + result.white)) * result.power
          };
        }

        // capability onoff
        if (state.ison != this.getCapabilityValue('onoff')) {
          this.setCapabilityValue('onoff', state.ison);
        }

        // capability dim
        if (state.dim != this.getCapabilityValue('dim')) {
          this.setCapabilityValue('dim', state.dim);
        }

        // capability light_temperature
        if (state.temperature != this.getCapabilityValue('light_temperature')) {
          this.setCapabilityValue('light_temperature', state.temperature);
        }

        // capability measure_power
        if (state.power != this.getCapabilityValue('measure_power')) {
          this.setCapabilityValue('measure_power', state.power);
        }

      } catch (error) {
        this.log(error);
        this.setUnavailable(this.homey.__('device.unreachable') + error.message);
        this.pingDevice();

        this.offlineTimeout = setTimeout(() => {
          this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": this.getName(), "device_error": error.toString()});
        }, 60000 * this.getSetting('offline'));
      }

    }, 1000 * this.getSetting('polling'));
  }

  pingDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pingInterval = setInterval(async () => {
      try {
        let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        this.setAvailable();
        this.pollDevice();
      } catch (error) {
        this.log('Device is not reachable, pinging every 63 seconds to see if it comes online again.');
      }
    }, 63000);
  }

  getCallbacks() {
    return [];
  }

}

module.exports = ShellyRGBW2CWWWDevice;
