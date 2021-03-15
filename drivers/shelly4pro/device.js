'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const semver = require('semver');
const callbacks = [];

class Shelly4ProDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.setAvailable();

    // SET UNICAST, DO INITIAL STATE OVER HTTP AND START POLLING IF COAP IS DISABLED
    this.bootSequence();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      const path = value ? '/relay/'+ this.getStoreValue("channel") +'?turn=on' : '/relay/'+ this.getStoreValue("channel") +'?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
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
      if (this.getStoreValue('channel') === 0) {
        const iconpath = "/userdata/" + this.getData().id +".svg";
        return await this.util.removeIcon(iconpath);
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
      let onoff = result.relays[channel].ison
      let measure_power = result.meters[channel].power;
      let meter_power = result.meters[channel].total * 0.000017;

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
        case 'relay0':
        case 'relay1':
        case 'relay2':
        case 'relay3':
          if (value != this.getCapabilityValue('onoff')) {
            this.setCapabilityValue('onoff', value);
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

}

module.exports = Shelly4ProDevice;
