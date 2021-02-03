'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
  'shortpush',
  'longpush'
];
// TODO: REMOVE AFTER 3.1.0
const temp_callbacks = [
  'btn_on',
  'btn_off',
  'out_on',
  'out_off',
  'shortpush',
  'longpush'
];

class Shelly25Device extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerOverpowered');

    this.setAvailable();

    // ADD AND REMOVE CAPABILITIES
    // TODO: REMOVE AFTER 3.1.0
    if (this.hasCapability('meter_power_wmin')) {
      this.removeCapability('meter_power_wmin');
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
    if (this.getStoreValue("channel") === 1) {
      if (this.hasCapability('measure_temperature')) {
        this.removeCapability('measure_temperature');
      }
    }

    // UPDATE INITIAL STATE
    setTimeout(() => {
      this.initialStateUpdate();
    }, this.getStoreValue('channel') * 2000);

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
      let alarm_generic = result.inputs[channel].input == 1 ? true : false;

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

      // capability alarm_generic
      if (alarm_generic != this.getCapabilityValue('alarm_generic')) {
        this.setCapabilityValue('alarm_generic', alarm_generic);
      }

      // update measure_temperature only for channel 0
      if (this.getStoreValue('channel') === 0) {
        // capability measure_temperature
        let measure_temperature = result.temperature;
        if (measure_temperature != this.getCapabilityValue('measure_temperature')) {
          this.setCapabilityValue('measure_temperature', measure_temperature);
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
        case 'relay1':
          if (value != this.getCapabilityValue('onoff')) {
            this.setCapabilityValue('onoff', value);
          }
          break;
        case 'power0':
        case 'power1':
          if (value != this.getCapabilityValue('measure_power')) {
            this.setCapabilityValue('measure_power', value);
          }
          break;
        case 'energyCounter0':
        case 'energyCounter1':
          let meter_power = value * 0.000017;
          if (meter_power != this.getCapabilityValue('meter_power')) {
            this.setCapabilityValue('meter_power', meter_power);
          }
          break;
        case 'deviceTemperature':
          if (value != this.getCapabilityValue('measure_temperature')) {
            this.setCapabilityValue('measure_temperature', value);
          }
          break;
        case 'input0':
        case 'input1':
          let alarm = value === 0 ? false : true;
          if (alarm != this.getCapabilityValue('alarm_generic')) {
            this.setCapabilityValue('alarm_generic', alarm);
          }
          break;
        case 'inputEvent0':
        case 'inputEvent1':
          let actionEvent = this.util.getActionEventDescription(value);
          this.setStoreValue('actionEvent', actionEvent);
          break;
        case 'inputEventCounter0':
        case 'inputEventCounter1':
          if (value > 0) {
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')});
          }
          break;
        case 'overPower0':
        case 'overPower1':
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
    return await this.util.removeCallbackEvents('/settings/actions?index='+ this.getStoreValue("channel") +'&name=', temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

}

module.exports = Shelly25Device;
