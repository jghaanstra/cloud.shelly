'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [];
// TODO: REMOVE AFTER 3.1.0
const temp_callbacks = [
  'out_on',
  'out_off'
];

class ShellyVintageDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.setAvailable();

    if (!this.getStoreValue('SDK') === 3) {
      // TODO: REMOVE AFTER 3.1.0
      if (this.hasCapability('button.callbackevents')) {
        this.removeCapability('button.callbackevents');
      }
      if (this.hasCapability('button.removecallbackevents')) {
        this.removeCapability('button.removecallbackevents');
      }
      this.setStoreValue("SDK", 3);
    }

    // SET UNICAST, DO INITIAL STATE OVER HTTP AND START POLLING IF COAP IS DISABLED
    this.bootSequence();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      const path = value ? '/light/0?turn=on' : '/light/0?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('dim', async (value) => {
      const dim = value * 100;
      return await this.util.sendCommand('/light/0?brightness='+ dim +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onAdded() {
    return await this.homey.app.updateShellyCollection();
  }

  async onDeleted() {
    return await this.homey.app.updateShellyCollection();
  }

  // HELPER FUNCTIONS
  async bootSequence() {
    try {
      if (this.homey.settings.get('general_coap')) {
        setInterval(() => {
          this.initialStateUpdate();
        }, this.homey.settings.get('general_polling_frequency') * 1000 || 5000);
      } else {
        setTimeout(() => {
          this.initialStateUpdate();
        }, 5000);
        if (!this.getStoreValue('unicast') === true) {
          const result = await this.util.setUnicast(this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
          this.setStoreValue("unicast", true);
        }
      }
    } catch (error) {
      this.log(error);
    }
  }

  async initialStateUpdate() {
    try {
      let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      if (!this.getAvailable()) { this.setAvailable(); }

      let onoff = result.lights[0].ison;
      let dim = result.lights[0].brightness > 100 ? 1 : result.lights[0].brightness / 100;
      let measure_power = result.meters[0].power;
      let meter_power = result.meters[0].total * 0.000017;

      // capability onoff
      if (onoff != this.getCapabilityValue('onoff')) {
        this.setCapabilityValue('onoff', onoff);
      }

      // capability dim
      if (dim != this.getCapabilityValue('dim')) {
        this.setCapabilityValue('dim', dim);
      }

      // capability measure_power
      if (measure_power != this.getCapabilityValue('measure_power')) {
        this.setCapabilityValue('measure_power', measure_power);
      }

      // capability meter_power
      if (meter_power != this.getCapabilityValue('meter_power')) {
        this.setCapabilityValue('meter_power', meter_power);
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
        case 'brightness':
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
        default:
          //this.log('Device does not support reported capability '+ capability +' with value '+ value);
      }
      return Promise.resolve(true);
    } catch(error) {
      this.log(error);
      return Promise.reject(error);
    }
  }

  getCallbacks() {
    return callbacks;
  }

  // TODO: REMOVE AFTER 3.1.0
  async removeCallbacks() {
    return await this.util.removeCallbackEvents('/settings/actions?index=0&name=', temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

}

module.exports = ShellyVintageDevice;
