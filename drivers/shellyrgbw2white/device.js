'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const semver = require('semver');
const callbacks = [];
// TODO: REMOVE AFTER 3.1.0
const temp_callbacks = [
  'out_on',
  'out_off'
];

class ShellyRGBW2WhiteDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerOverpowered');

    // TODO: REMOVE AFTER 3.1.0
    this.homey.flow.getDeviceTriggerCard('triggerInput');

    this.setAvailable();

    if (!this.getStoreValue('SDK') === 3) {
      // TODO: REMOVE AFTER 3.1.0
      if (!this.hasCapability('meter_power')) {
        this.addCapability('meter_power');
      }
      if (this.hasCapability('alarm_generic')) {
        this.removeCapability('alarm_generic');
      }
      if (!this.hasCapability('input_1') && this.getStoreValue('channel') == 0) {
        this.addCapability('input_1');
      }
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
      clearInterval(this.pollingInterval);
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
  async bootSequence() {
    try {
      if (this.homey.settings.get('general_coap')) {
        this.pollingInterval = setInterval(() => {
          setTimeout(async () => {
            await this.initialStateUpdate();
          }, this.getStoreValue('channel') * 1000);
        }, this.homey.settings.get('general_polling_frequency') * 1000 || 5000);
      } else {
        setTimeout(() => {
          this.initialStateUpdate();
        }, this.util.getRandomTimeout(10));
        this.pollingInterval = setInterval(() => {
          this.initialStateUpdate();
        }, (60000 + (1000 * this.getStoreValue('channel'))));
      }
    } catch (error) {
      this.log(error);
    }
  }

  async initialStateUpdate() {
    try {
      let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      if (!this.getAvailable()) { this.setAvailable(); }

      let channel = this.getStoreValue('channel');
      let onoff = result.lights[channel].ison;
      let measure_power = result.meters[channel].power;
      let meter_power = result.meters[channel].total * 0.000017;
      let dim = result.lights[channel].brightness > 100 ? 1 : result.lights[channel].brightness / 100;
      let input_1 = result.inputs[0].input === 1 ? true : false;

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

      // capability input_1
      if (input_1 != this.getCapabilityValue('input_1') && this.getStoreValue('channel') == 0) {
        this.setCapabilityValue('input_1', input_1);
        if (input_1) {
          this.homey.flow.getDeviceTriggerCard('triggerInput1On').trigger(this, {}, {});
        } else {
          this.homey.flow.getDeviceTriggerCard('triggerInput1Off').trigger(this, {}, {});
        }
      }

      // update unicast for channel 0
      if (this.getStoreValue('channel') === 0) {
        const version = result.update.old_version.match(/v([0-9a-z.-]+)/)[1];
        if (semver.gt(version, '1.9.9') && !this.getStoreValue('unicast') === true) {
          const result = await this.util.setUnicast(this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
          if (result === 'OK') {
            this.setStoreValue("unicast", true);
          }  
        }
      }

    } catch (error) {
      this.setUnavailable(this.homey.__('device.unreachable') + error.message);
      this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": this.getName(), "device_error": error.message});
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
          let input_1 = value === 0 ? false : true;
          if (input_1 != this.getCapabilityValue('input_1') && this.getStoreValue('channel') == 0) {
            this.setCapabilityValue('input_1', input_1);
            if (input_1) {
              this.homey.flow.getDeviceTriggerCard('triggerInput1On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInput1Off').trigger(this, {}, {});
            }
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
