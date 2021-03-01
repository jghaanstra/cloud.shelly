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

class ShellyUniDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerInput');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature2');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature3');

    this.setAvailable();

    // ADD AND REMOVE CAPABILITIES
    // TODO: REMOVE AFTER 3.1.0
    if (!this.hasCapability('alarm_generic')) {
      this.addCapability('alarm_generic');
    }
    if (this.hasCapability('button.callbackevents')) {
      this.removeCapability('button.callbackevents');
    }
    if (this.hasCapability('button.removecallbackevents')) {
      this.removeCapability('button.removecallbackevents');
    }

    // UPDATE INITIAL STATE AND POLLING IF NEEDED
    if (this.homey.settings.get('general_coap')) {
      setInterval(async () => {
        await this.initialStateUpdate();
      }, 5000);
    } else {
      this.initialStateUpdate();
    }

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      const path = value ? '/relay/'+ this.getStoreValue("channel") +'?turn=on' : '/relay/'+ this.getStoreValue("channel") +'?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });
  }

  async onAdded() {
    return await this.homey.app.updateShellyCollection();
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
        case 'externalTemperature0':
          if (!this.hasCapability('measure_temperature')) {
            this.addCapability('measure_temperature');
          } else {
            if (value != this.getCapabilityValue('measure_temperature')) {
              this.setCapabilityValue('measure_temperature', value);
            }
          }
          break;
        case 'externalTemperature1':
          if (!this.hasCapability('measure_temperature.2')) {
            this.addCapability('measure_temperature.2');
          } else {
            if (value != this.getCapabilityValue('measure_temperature.2')) {
              this.setCapabilityValue('measure_temperature.2', value);
              this.homey.flow.getDeviceTriggerCard('triggerTemperature2').trigger(this, {'temperature': value}, {})
            }
          }
          break;
        case 'externalTemperature2':
          if (!this.hasCapability('measure_temperature.3')) {
            this.addCapability('measure_temperature.3');
          } else {
            if (value != this.getCapabilityValue('measure_temperature.3')) {
              this.setCapabilityValue('measure_temperature.3', value);
              this.homey.flow.getDeviceTriggerCard('triggerTemperature3').trigger(this, {'temperature': value}, {})
            }
          }
          break;
        case 'externalHumidity':
          if (!this.hasCapability('measure_humidity')) {
            this.addCapability('measure_humidity');
          } else {
            if (value != this.getCapabilityValue('measure_humidity')) {
              this.setCapabilityValue('measure_humidity', value);
            }
          }
          break;
        case 'input0':
          let alarm_generic = value === 0 ? false : true;
          if (alarm_generic != this.getCapabilityValue('alarm_generic')) {
            this.setCapabilityValue('alarm_generic', alarm_generic);
            this.homey.flow.getDeviceTriggerCard('triggerInput').trigger(this, {'input': 'input 1', 'state': alarm_generic.toString()}, {});
          }
          break;
        case 'input1':
          let alarm_generic_1 = value === 0 ? false : true;
          if (alarm_generic_1 != this.getCapabilityValue('alarm_generic')) {
            this.setCapabilityValue('alarm_generic', alarm_generic_1);
            this.homey.flow.getDeviceTriggerCard('triggerInput').trigger(this, {'input': 'input 2', 'state': alarm_generic_1.toString()}, {});
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

module.exports = ShellyUniDevice;
