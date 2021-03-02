'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
  'shortpush',
  'longpush'
];
const callbacks_triggers = [
  'shortpush_1',
  'longpush_1',
  'shortpush_2',
  'longpush_2'
];

class Shelly1lDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerInput');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature1');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature2');
    this.homey.flow.getDeviceTriggerCard('triggerTemperature3');
    this.homey.flow.getDeviceTriggerCard('triggerOverpowered');

    this.setAvailable();

    // TODO: ADD AND REMOVE STUFF - REMOVE CODE AFTER 3.1.0
    if (this.hasCapability('alarm_generic')) {
      this.removeCapability('alarm_generic');
    }
    if (this.hasCapability('alarm_generic.1')) {
      this.removeCapability('alarm_generic.1');
    }
    if (!this.hasCapability('input_1')) {
      this.addCapability('input_1');
    }
    if (!this.hasCapability('input_2')) {
      this.addCapability('input_2');
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
      const path = value ? '/relay/0?turn=on' : '/relay/0?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onAdded() {
    return await this.homey.app.updateShellyCollection();
  }

  async onDeleted() {
    try {
      const iconpath = "/userdata/" + this.getData().id +".svg";
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
      let measure_temperature = result.temperature;
      let input_1 = result.inputs[0].input == 1 ? true : false;
      let input_2 = result.inputs[1].input == 1 ? true : false;

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

      // capability measure_temperature
      if (measure_temperature != this.getCapabilityValue('measure_temperature')) {
        this.setCapabilityValue('measure_temperature', measure_temperature);
      }

      // capability input_1
      if (input_1 != this.getCapabilityValue('input_1')) {
        this.setCapabilityValue('input_1', input_1);
        this.homey.flow.getDeviceTriggerCard('triggerInput').trigger(this, {'input': 'input 1', 'state': input_1.toString()}, {});
      }

      // capability input_2
      if (input_2 != this.getCapabilityValue('input_2')) {
        this.setCapabilityValue('input_2', input_2);
        this.homey.flow.getDeviceTriggerCard('triggerInput').trigger(this, {'input': 'input 2', 'state': input_2.toString()}, {});
      }

      // capability measure_temperature.1, measure_temperature.2, measure_temperature.3
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

      // capability input_external
      if ("ext_switch" in result) {
        if (result.ext_switch.hasOwnProperty([0]) && !this.hasCapability('input_external')) {
          this.addCapability('input_external');
        } else if (result.ext_switch.hasOwnProperty([0]) && this.hasCapability('input_external')) {
          let input_external = result.ext_switch[0].input === 0 ? false : true;
          if (input_external != this.getCapabilityValue('input_external')) {
            this.setCapabilityValue('input_external', input_external);
            this.homey.flow.getDeviceTriggerCard('triggerInput').trigger(this, {'input': 'external switch 1', 'state': input_external.toString()}, {});
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
        case 'deviceTemperature':
          if (value != this.getCapabilityValue('measure_temperature')) {
            this.setCapabilityValue('measure_temperature', value);
          }
          break;
        case 'externalTemperature0':
          if (value != this.getCapabilityValue('measure_temperature.1')) {
            this.setCapabilityValue('measure_temperature.1', value);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature1').trigger(this, {'temperature': value}, {});
          }
          break;
        case 'externalTemperature1':
          if (value != this.getCapabilityValue('measure_temperature.2')) {
            this.setCapabilityValue('measure_temperature.2', value);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature2').trigger(this, {'temperature': value}, {});
          }
          break;
        case 'externalTemperature2':
          if (value != this.getCapabilityValue('measure_temperature.3')) {
            this.setCapabilityValue('measure_temperature.3', value);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature3').trigger(this, {'temperature': value}, {});
          }
          break;
        case 'externalHumidity':
          if (value != this.getCapabilityValue('measure_humidity')) {
            this.setCapabilityValue('measure_humidity', value);
          }
          break;
        case 'externalInput0':
          let input_external = value === 0 ? false : true;
          if (input_external != this.getCapabilityValue('input_external')) {
            this.setCapabilityValue('input_external', input_external);
            this.homey.flow.getDeviceTriggerCard('triggerInput').trigger(this, {'input': 'external switch 1', 'state': input_external.toString()}, {});
          }
          break;
        case 'input0':
          let input_1 = value === 0 ? false : true;
          if (input_1 != this.getCapabilityValue('input_1')) {
            this.setCapabilityValue('input_1', input_1);
            this.homey.flow.getDeviceTriggerCard('triggerInput').trigger(this, {'input': 'input 1', 'state': input_1.toString()}, {});
          }
          break;
        case 'input1':
          let input_2 = value === 0 ? false : true;
          if (input_2 != this.getCapabilityValue('input_2')) {
            this.setCapabilityValue('input_2', input_2);
            this.homey.flow.getDeviceTriggerCard('triggerInput').trigger(this, {'input': 'input 2', 'state': input_2.toString()}, {});
          }
          break;
        case 'inputEvent0':
          let actionEvent1 = this.util.getActionEventDescription(value) + '_1';
          this.setStoreValue('actionEvent1', actionEvent1);
          break;
        case 'inputEvent1':
          let actionEvent2 = this.util.getActionEventDescription(value) + '_2';
          this.setStoreValue('actionEvent2', actionEvent2);
          break;
        case 'inputEventCounter0':
          if (value > 0) {
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent1')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent1')});
          }
          break;
        case 'inputEventCounter1':
          if (value > 0) {
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent2')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent2')});
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
    return callbacks_triggers;
  }

}

module.exports = Shelly1lDevice;
