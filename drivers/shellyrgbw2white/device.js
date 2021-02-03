'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [];
// TODO: REMOVE AFTER 3.1.0
const temp_callbacks = [
  'out_on',
  'out_off'
];

class ShellyRGBW2WhiteDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerOverpowered');

    this.setAvailable();

    // ADD MISSING CAPABILITIES
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
    setTimeout(() => {
      this.initialStateUpdate();
    }, this.getStoreValue('channel') * 2000);

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      const path = value ? '/white/'+ this.getStoreValue("channel") +'?turn=on' : '/white/'+ this.getStoreValue("channel") +'?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('dim', async (value) => {
      const dim = value * 100;
      return await this.util.sendCommand('/white/'+ this.getStoreValue('channel') +'?brightness='+ dim +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onAdded() {
    setTimeout(async () => {
    return await this.homey.app.updateShellyCollection();
    }, this.getStoreValue('channel') * 2000);
  }

  async onDeleted() {
    try {
      if (this.getStoreValue('channel') == 0) {
        const iconpath = "/userdata/" + this.getData().id +".svg";
        await this.util.removeIcon(iconpath);
      }
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

      let channel = this.getStoreValue('channel');
      let onoff = result.relays[channel].ison;
      let measure_power = result.meters[channel].power;
      let meter_power = result.meters[channel].total * 0.000017;
      let dim = result.lights[channel].brightness > 100 ? 1 : result.lights[channel].brightness / 100;
      let alarm_generic = results.inputs[0].input === 1 ? true : false;

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

      // capability dim
      if (dim != this.getCapabilityValue('dim')) {
        this.setCapabilityValue('dim', dim);
      }

      // capability alarm_generic
      if (alarm_generic != this.getCapabilityValue('alarm_generic')) {
        this.setCapabilityValue('alarm_generic', alarm_generic);
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
        case 'switch0':
        case 'switch1':
        case 'switch2':
        case 'switch3':
          if (value != this.getCapabilityValue('onoff')) {
            this.setCapabilityValue('onoff', value);
          }
          break;
        case 'brightness0':
        case 'brightness1':
        case 'brightness2':
        case 'brightness3':
          let dim = value >= 100 ? 1 : value / 100;
          if (dim != this.getCapabilityValue('dim')) {
            this.setCapabilityValue('dim', dim);
          }
          break;
        case 'power0':
        case 'power1':
        case 'power2':
        case 'power3':
          if (value != this.getCapabilityValue('measure_power')) {
            this.setCapabilityValue('measure_power', value);
          }
          break;
        case 'energyCounter0':
        case 'energyCounter1':
        case 'energyCounter2':
        case 'energyCounter3':
          let meter_power = value * 0.000017;
          if (meter_power != this.getCapabilityValue('meter_power')) {
            this.setCapabilityValue('meter_power', meter_power);
          }
          break;
        case 'input0':
          let alarm = value === 0 ? false : true;
          if (alarm != this.getCapabilityValue('alarm_generic')) {
            this.setCapabilityValue('alarm_generic', alarm);
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

  getCallbacks() {
    return callbacks;
  }

  // TODO: REMOVE AFTER 3.1.0
  async removeCallbacks() {
    return await this.util.removeCallbackEvents('/settings/actions?index=0&name='+ this.getStoreValue("channel") +'?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

}

module.exports = ShellyRGBW2WhiteDevice;
