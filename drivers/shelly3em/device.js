'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [];
// TODO: REMOVE AFTER 3.1.0
const temp_callbacks = [
  'out_on',
  'out_off'
];

class Shelly3EmDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned');
    this.homey.flow.getDeviceTriggerCard('triggerMeterPowerFactor');
    this.homey.flow.getDeviceTriggerCard('triggerOverpowered');

    this.setAvailable();

    // TODO: REMOVE AFTER 3.1.0
    // REMOVE ONOFF FOR CHANNEL 1 AND 2 AS SHELLY 3EM SHARES THIS OVER CHANNEL 0
    if (this.getStoreValue("channel") !== 0) {
      if (this.hasCapability('onoff')) {
        this.removeCapability('onoff');
      }
    }
    if (this.hasCapability('meter_power_consumed')) {
      this.removeCapability('meter_power_consumed');
    }
    if (!this.hasCapability('meter_power')) {
      this.addCapability('meter_power');
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
      const path = value ? '/relay/0?turn=on' : '/relay/0?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onAdded() {
    setTimeout(async () => {
      return await this.homey.app.updateShellyCollection();
    }, this.getStoreValue('channel') * 2000);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.setEnergy({ cumulative: newSettings.cumulative });
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
      let measure_power = result.meters[channel].power;
      let meter_power_factor = result.emeters[channel].pf;
      let measure_current = result.emeters[channel].current;
      let measure_voltage = result.emeters[channel].voltage;
      let meter_power = result.emeters[channel].total / 1000;
      let meter_power_returned = result.emeters[channel].total_returned / 1000;
      let meter_power_returned_rounded = Number(meter_power_returned.toFixed(3));

      // capability measure_power
      if (measure_power != this.getCapabilityValue('measure_power')) {
        this.setCapabilityValue('measure_power', measure_power);
      }

      // capability meter_power_factor
      if (meter_power_factor != this.getCapabilityValue('meter_power_factor')) {
        this.setCapabilityValue('meter_power_factor', meter_power_factor);
      }

      // capability measure_current
      if (measure_current != this.getCapabilityValue('measure_current')) {
        this.setCapabilityValue('measure_current', measure_current);
      }

      // capability measure_voltage
      if (measure_voltage != this.getCapabilityValue('measure_voltage')) {
        this.setCapabilityValue('measure_voltage', measure_voltage);
      }

      // capability meter_power
      if (meter_power != this.getCapabilityValue('meter_power')) {
        this.setCapabilityValue('meter_power', meter_power);
      }

      // capability meter_power_returned
      if (meter_power_returned_rounded != this.getCapabilityValue('meter_power_returned')) {
        this.setCapabilityValue('meter_power_returned', meter_power_returned_rounded);
      }

      // update measure_power and meter_power only for channel 0
      if (this.getStoreValue('channel') === 0) {
        // capability onoff
        let onoff = this.getStoreValue("channel") === 0 ? result.relays[0].ison : result.relays[1].ison;
        if (onoff != this.getCapabilityValue('onoff')) {
          this.setCapabilityValue('onoff', onoff);
        }
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
        case 'power1':
        case 'power2':
          if (value != this.getCapabilityValue('measure_power')) {
            this.setCapabilityValue('measure_power', value);
          }
          break;
        case 'energyCounter0':
        case 'energyCounter1':
        case 'energyCounter2':
          let meter_power = value / 1000;
          if (meter_power != this.getCapabilityValue('meter_power')) {
            this.setCapabilityValue('meter_power', meter_power);
          }
          break;
        case 'energyReturned0':
        case 'energyReturned1':
        case 'energyReturned2':
          let meter_power_returned = value / 1000;
          let meter_power_returned_rounded = Number(meter_power_returned.toFixed(3));
          if (meter_power_returned_rounded != this.getCapabilityValue('meter_power_returned')) {
            this.setCapabilityValue('meter_power_returned', meter_power_returned_rounded);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned').trigger(this, {'energy': meter_power_returned_rounded}, {});
          }
          break;
        case 'powerFactor0':
        case 'powerFactor1':
        case 'powerFactor2':
          if (value != this.getCapabilityValue('meter_power_factor')) {
            this.setCapabilityValue('meter_power_factor', value);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerFactor').trigger(this, {'pf': value}, {});
          }
          break;
        case 'current0':
        case 'current1':
        case 'current2':
          if (value != this.getCapabilityValue('measure_current')) {
            this.setCapabilityValue('measure_current', value);
          }
          break;
        case 'voltage0':
        case 'voltage1':
        case 'voltage2':
          if (value != this.getCapabilityValue('measure_voltage')) {
            this.setCapabilityValue('measure_voltage', value);
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
    return await this.util.removeCallbackEvents('/settings/actions?index=0&name=', temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

}

module.exports = Shelly3EmDevice;
