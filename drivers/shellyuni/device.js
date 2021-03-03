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

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature1');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature2');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature3');

    // TODO: REMOVE AFTER 3.1.0
    this.homey.flow.getDeviceTriggerCard('triggerInput');

    this.setAvailable();

    // ADD AND REMOVE CAPABILITIES
    // TODO: REMOVE AFTER 3.1.0
    if (this.hasCapability('alarm_generic')) {
      this.removeCapability('alarm_generic');
    }
    if (!this.hasCapability('input_1')) {
      this.addCapability('input_1');
    }
    if (!this.hasCapability('measure_temperature.1')) {
      this.addCapability('measure_temperature.1');
    }
    if (this.hasCapability('measure_temperature')) {
      this.removeCapability('measure_temperature');
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
      }, this.homey.settings.get('general_polling_frequency') * 1000 || 5000);
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
      let input_1 = result.inputs[channel].input == 1 ? true : false;

      // capability onoff
      if (onoff != this.getCapabilityValue('onoff')) {
        this.setCapabilityValue('onoff', onoff);
      }

      // capability input_1
      if (input_1 != this.getCapabilityValue('input_1')) {
        this.setCapabilityValue('input_1', input_1);
        if (input_1) {
          this.homey.flow.getDeviceTriggerCard('triggerInput1On').trigger(this, {}, {});
        } else {
          this.homey.flow.getDeviceTriggerCard('triggerInput1Off').trigger(this, {}, {});
        }
      }

      // capability measure_temperature, measure_temperature.2, measure_temperature.3
      if (Object.entries(result.ext_temperature).length !== 0) {
        // sensor 1
        if (result.ext_temperature.hasOwnProperty([0]) && !this.hasCapability('measure_temperature.1')) {
          this.addCapability('measure_temperature.1');
        } else if (result.ext_temperature.hasOwnProperty([0]) && this.hasCapability('measure_temperature.1')) {
          let temp1 = result.ext_temperature[0].tC;
          if (temp1 != this.getCapabilityValue('measure_temperature.1')) {
            this.setCapabilityValue('measure_temperature.1', temp1);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature1').trigger(this, {'temperature': temp1}, {});
          }
        }

        // sensor 2
        if (result.ext_temperature.hasOwnProperty([1]) && !this.hasCapability('measure_temperature.2')) {
          this.addCapability('measure_temperature.2');
        } else if (result.ext_temperature.hasOwnProperty([1]) && this.hasCapability('measure_temperature.2')) {
          let temp2 = result.ext_temperature[1].tC;
          if (temp2 != this.getCapabilityValue('measure_temperature.2')) {
            this.setCapabilityValue('measure_temperature.2', temp2);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature2').trigger(this, {'temperature': temp2}, {});
          }
        }

        // sensor 3
        if (result.ext_temperature.hasOwnProperty([2]) && !this.hasCapability('measure_temperature.3')) {
          this.addCapability('measure_temperature.3');
        } else if (result.ext_temperature.hasOwnProperty([2]) && this.hasCapability('measure_temperature.3')) {
          let temp3 = result.ext_temperature[2].tC;
          if (temp3 != this.getCapabilityValue('measure_temperature.3')) {
            this.setCapabilityValue('measure_temperature.3', temp3);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature3').trigger(this, {'temperature': temp3}, {});
          }
        }
      }

      // capability measure_humidity
      if (Object.entries(result.ext_humidity).length !== 0) {
        if (result.ext_humidity.hasOwnProperty([0]) && !this.hasCapability('measure_humidity')) {
          this.addCapability('measure_humidity');
        } else if (result.ext_humidity.hasOwnProperty([0]) && this.hasCapability('measure_humidity')) {
          let measure_humidity = result.ext_humidity[0].hum;
          if (measure_humidity != this.getCapabilityValue('measure_humidity')) {
            this.setCapabilityValue('measure_humidity', measure_humidity);
          }
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
        case 'externalTemperature0':
          if (value != this.getCapabilityValue('measure_temperature.1')) {
            this.setCapabilityValue('measure_temperature.1', value);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature1').trigger(this, {'temperature': value}, {})
          }
          break;
        case 'externalTemperature1':
          if (value != this.getCapabilityValue('measure_temperature.2')) {
            this.setCapabilityValue('measure_temperature.2', value);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature2').trigger(this, {'temperature': value}, {})
          }
          break;
        case 'externalTemperature2':
          if (value != this.getCapabilityValue('measure_temperature.3')) {
            this.setCapabilityValue('measure_temperature.3', value);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature3').trigger(this, {'temperature': value}, {})
          }
          break;
        case 'externalHumidity':
          if (value != this.getCapabilityValue('measure_humidity')) {
            this.setCapabilityValue('measure_humidity', value);
          }
          break;
        case 'input0':
          let input_1 = value === 0 ? false : true;
          if (input_1 != this.getCapabilityValue('input_1')) {
            this.setCapabilityValue('input_1', input_1);
            if (input_1) {
              this.homey.flow.getDeviceTriggerCard('triggerInput1On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInput1Off').trigger(this, {}, {});
            }
          }
          break;
        case 'input1':
          let input_1_1 = value === 0 ? false : true;
          if (input_1_1 != this.getCapabilityValue('input_1')) {
            this.setCapabilityValue('input_1', input_1_1);
            this.homey.flow.getDeviceTriggerCard('triggerInput').trigger(this, {'input': 'input 2', 'state': input_1_1.toString()}, {});
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
