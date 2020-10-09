'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
  'btn_on',
  'out_on',
  'out_off'
];

class ShellyPlugDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.setAvailable();

    // REMOVE CAPABILITIES
    // TODO: REMOVE AFTER 3.1.0
    if (this.hasCapability('meter_power_wmin')) {
      this.removeCapability('meter_power_wmin');
    }

    // UPDATE INITIAL STATE
    this.initialStateUpdate();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      const path = value ? '/relay/0?turn=on' : '/relay/0?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.callbackevents', async () => {
      return await this.util.addCallbackEvents('/settings/relay/0?', callbacks, 'shelly-plug', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await this.util.removeCallbackEvents('/settings/relay/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onAdded() {
    /*await this.util.addCallbackEvents('/settings/relay/0?', callbacks, 'shelly-plug', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));*/
    return await this.homey.app.updateShellyCollection();;
  }

  async onDeleted() {
    try {
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await this.util.removeCallbackEvents('/settings/relay/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
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

      let onoff = result.relays[0].ison;
      let measure_power = result.meters[0].power;
      let meter_power = result.meters[0].total * 0.000017;

      // capability onoff
      if (onoff != this.getCapabilityValue('onoff')) {
        this.setCapabilityValue('onoff', onoff);
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
        case 'relay0':
          if (value != this.getCapabilityValue('onoff')) {
            this.setCapabilityValue('onoff', value);
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
          this.log('Device does not support reported capability '+ capability +' with value '+ value);
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

}

module.exports = ShellyPlugDevice;
