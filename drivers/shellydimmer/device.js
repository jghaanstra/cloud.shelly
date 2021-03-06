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
// TODO: REMOVE AFTER 3.1.0
const temp_callbacks = [
  'btn1_on',
  'btn1_off',
  'btn2_on',
  'btn2_off',
  'out_on',
  'out_off',
  'btn1_shortpush',
  'btn1_longpush',
  'btn2_shortpush',
  'btn2_longpush'
];

class ShellyDimmerDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput2On');
    this.homey.flow.getDeviceTriggerCard('triggerInput2Off');
    this.homey.flow.getDeviceTriggerCard('triggerOverpowered');

    // TODO: REMOVE AFTER 3.1.0
    this.homey.flow.getDeviceTriggerCard('triggerInput');

    // TODO: REMOVE AFTER 3.1.0
    this.homey.flow.getDeviceTriggerCard('triggerInput1');

    this.setAvailable();

    if (!this.getStoreValue('SDK') === 3) {
      // TODO: REMOVE AFTER 3.1.0
      if (this.hasCapability('meter_power_wmin')) {
        this.removeCapability('meter_power_wmin');
      }
      if (this.hasCapability('onoff.input1')) {
        this.removeCapability('onoff.input1');
      }
      if (this.hasCapability('onoff.input2')) {
        this.removeCapability('onoff.input2');
      }
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
      const path = value ? '/light/0?turn=on' : '/light/0?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('dim', async (value) => {
      if (!this.getCapabilityValue('onoff')) {
        this.setCapabilityValue('onoff', true);
      }
      const dim = value * 100;
      return await this.util.sendCommand('/light/0?brightness='+ dim +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
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
  async bootSequence() {
    try {
      if (this.homey.settings.get('general_coap')) {
        setInterval(() => {
          this.initialStateUpdate();
        }, this.homey.settings.get('general_polling_frequency') * 1000 || 5000);
      } else {
        setTimeout(() => {
          this.initialStateUpdate();
        }, 5000);
        if (!this.getStoreValue('unicast') === true) {
          const result = await this.util.setUnicast(this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
          this.setStoreValue("unicast", true);
        }
      }
    } catch (error) {
      this.log(error);
    }
  }
  
  async initialStateUpdate() {
    try {
      let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      if (!this.getAvailable()) { this.setAvailable(); }

      let onoff = result.lights[0].ison;
      let measure_power = result.meters[0].power;
      let meter_power = result.meters[0].total * 0.000017;
      let dim = Number(result.lights[0].brightness) / 100;
      let measure_temperature = result.tmp.tC;
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

      // capability dim
      if (dim != this.getCapabilityValue('dim')) {
        this.setCapabilityValue('dim', dim);
      }

      // capability measure_temperature
      if (measure_temperature != this.getCapabilityValue('measure_temperature')) {
        this.setCapabilityValue('measure_temperature', measure_temperature);
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

      // capability input_2
      if (input_2 != this.getCapabilityValue('input_2')) {
        this.setCapabilityValue('input_2', input_2);
        if (input_2) {
          this.homey.flow.getDeviceTriggerCard('triggerInput2On').trigger(this, {}, {});
        } else {
          this.homey.flow.getDeviceTriggerCard('triggerInput2Off').trigger(this, {}, {});
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
        case 'switch':
          if (value != this.getCapabilityValue('onoff')) {
            this.setCapabilityValue('onoff', value);
          }
          break;
        case 'brightness':
          let dim = value >= 100 ? 1 : value / 100;
          if (dim != this.getCapabilityValue('dim')) {
            this.setCapabilityValue('dim', dim);
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
          let input_2 = value === 0 ? false : true;
          if (input_2 != this.getCapabilityValue('input_2')) {
            this.setCapabilityValue('input_2', input_2);
            if (input_2) {
              this.homey.flow.getDeviceTriggerCard('triggerInput2On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInput2Off').trigger(this, {}, {});
            }
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

  // TODO: REMOVE AFTER 3.1.0
  async removeCallbacks() {
    return await this.util.removeCallbackEvents('/settings/actions?index=0&name=', temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

}

module.exports = ShellyDimmerDevice;
