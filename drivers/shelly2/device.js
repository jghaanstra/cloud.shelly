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

class Shelly2Device extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerOverpowered');

    this.setAvailable();

    // ADD AND REMOVE CAPABILITIES
    // TODO: REMOVE AFTER 3.1.0
    if (this.hasCapability('measure_voltage')) {
      this.removeCapability('measure_voltage');
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
    // REMOVE MEASURE_POWER AND METER_POWER FOR CHANNEL 1 AS SHELLY SHARES THIS OVER CHANNEL 0 AND CHANNEL 1
    if (this.getStoreValue("channel") === 1) {
      if (this.hasCapability('measure_power')) {
        this.removeCapability('measure_power');
      }
      if (this.hasCapability('meter_power')) {
        this.removeCapability('meter_power');
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
      if (this.getStoreValue('channel') === 0) {
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
      let alarm_generic = result.inputs[channel].input == 1 ? true : false;

      // capability onoff
      if (onoff != this.getCapabilityValue('onoff')) {
        this.setCapabilityValue('onoff', onoff);
      }

      // capability alarm_generic
      if (alarm_generic != this.getCapabilityValue('alarm_generic')) {
        this.setCapabilityValue('alarm_generic', alarm_generic);
      }

      // update measure_power and meter_power only for channel 0
      if (this.getStoreValue('channel') === 0) {
        let measure_power = result.meters[0].power;
        let meter_power = result.meters[0].total * 0.000017;

        // capability measure_power
        if (measure_power != this.getCapabilityValue('measure_power')) {
          this.setCapabilityValue('measure_power', measure_power);
        }

        // capability meter_power
        if (meter_power != this.getCapabilityValue('meter_power')) {
          this.setCapabilityValue('meter_power', meter_power);
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
    return await this.util.removeCallbackEvents('/settings/actions?index=0&name='+ this.getStoreValue("channel") +'?', temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

}

module.exports = Shelly2Device;
