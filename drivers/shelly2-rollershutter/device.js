'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [];
// TODO: REMOVE AFTER 3.1.0
const temp_callbacks = [
  'roller_open',
  'roller_close',
  'roller_stop'
];

class Shelly2RollerShutterDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.setAvailable();

    // ADD AND REMOVE CAPABILITIES
    // TODO: REMOVE AFTER 3.1.0
    if (!this.hasCapability('meter_power')) {
      this.addCapability('meter_power');
    }
    if (!this.hasCapability('alarm_generic')) {
      this.addCapability('alarm_generic');
    }
    if (!this.hasCapability('alarm_generic.1')) {
      this.addCapability('alarm_generic.1');
    }
    if (this.hasCapability('button.callbackevents')) {
      this.removeCapability('button.callbackevents');
    }
    if (this.hasCapability('button.removecallbackevents')) {
      this.removeCapability('button.removecallbackevents');
    }

    // UPDATE INITIAL STATE
    this.initialStateUpdate();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('windowcoverings_state', async (value) => {
      if (value !== 'idle' && value !== this.getStoreValue('last_action')) {
        this.setStoreValue('last_action', value);
      }

      if (value == 'idle') {
        return await this.util.sendCommand('/roller/0?go=stop', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else if (value == 'up') {
        return await this.util.sendCommand('/roller/0?go=open', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else if (value == 'down') {
        return await this.util.sendCommand('/roller/0?go=close', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return Promise.reject('State not recognized ...');
      }
    });

    this.registerCapabilityListener('windowcoverings_set', async (value) => {
      if (this.getSetting('halfway') == 0.5) {
        var position = value;
      } else {
        if (value > 0.5) {
          var position = -2 * value * this.getSetting('halfway') + 2 * value + 2 * this.getSetting('halfway') - 1;
        } else {
          var position = 2 * value * this.getSetting('halfway');
        };
      }
      this.setStoreValue('previous_position', this.getCapabilityValue('windowcoverings_set'));
      return await this.util.sendCommand('/roller/0?go=to_pos&roller_pos='+ Math.round(position*100), this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.sethalfwayposition', async () => {
      try {
        let result = this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        let position = result.rollers[0].current_pos >= 100 ? 1 : result.rollers[0].current_pos / 100;
        this.setSettings({'halfway':  position});
        return Promise.resolve(true);
      } catch (error) {
        this.log(error);
        return Promise.reject(error);
      }
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

      let measure_power = result.meters[0].power;
      let meter_power = result.meters[0].total * 0.000017;
      let alarm_generic = result.inputs[0].input == 1 ? true : false;
      let alarm_generic_1 = result.inputs[1].input == 1 ? true : false;
      var windowcoverings_set = result.rollers[0].current_pos >= 100 ? 1 : result.rollers[0].current_pos / 100;

      if ( result.rollers[0].state == 'stop' ) {
        var windowcoverings_state = 'idle';
      } else if ( result.rollers[0].state == 'open' ) {
        var windowcoverings_state = 'up';
      } else if ( result.rollers[0].state == 'close' ) {
        var windowcoverings_state = 'down';
      }
      if (windowcoverings_state !== 'idle' && windowcoverings_state !== this.getStoreValue('last_action')) {
        this.setStoreValue('last_action', windowcoverings_state);
      }

      if (this.getSetting('halfway') !== 0.5) {
        if (windowcoverings_set < this.getSetting('halfway')) {
          windowcoverings_set = 0.5 * windowcoverings_set / this.getSetting('halfway');
        } else {
          windowcoverings_set = windowcoverings_set - (1 - (windowcoverings_set - this.getSetting('halfway')) * (1 / (1 - this.getSetting('halfway')))) * (this.getSetting('halfway') - 0.5);
        };
      };

      // capability windowcoverings_state
      if (windowcoverings_state != this.getCapabilityValue('windowcoverings_state')) {
        this.setCapabilityValue('windowcoverings_state', windowcoverings_state);
      }

      // capability measure_power
      if (measure_power != this.getCapabilityValue('measure_power')) {
        this.setCapabilityValue('measure_power', measure_power);
      }

      // capability meter_power
      if (meter_power != this.getCapabilityValue('meter_power')) {
        this.setCapabilityValue('meter_power', meter_power);
      }

      // capability windowcoverings_set
      if (windowcoverings_set != this.getCapabilityValue('windowcoverings_set')) {
        this.setCapabilityValue('windowcoverings_set', windowcoverings_set);
      }

      // capability alarm_generic
      if (alarm_generic != this.getCapabilityValue('alarm_generic')) {
        this.setCapabilityValue('alarm_generic', alarm_generic);
      }
      // capability alarm_generic.1
      if (alarm_generic_1 != this.getCapabilityValue('alarm_generic.1')) {
        this.setCapabilityValue('alarm_generic.1', alarm_generic_1);
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
        case 'rollerState':
          switch(value) {
            case 'stop':
              var windowcoverings_state = 'idle'
              break;
            case 'open':
              var windowcoverings_state = 'up';
              break;
            case 'close':
              var windowcoverings_state = 'down';
              break;
            default:
              var windowcoverings_state = value;
          }
          if (windowcoverings_state !== 'idle' && windowcoverings_state !== this.getStoreValue('last_action')) {
            this.setStoreValue('last_action', windowcoverings_state);
          }
          if (windowcoverings_state != this.getCapabilityValue('windowcoverings_state')) {
            this.setCapabilityValue('windowcoverings_state', windowcoverings_state);
          }
          break;
        case 'rollerPosition':
          var windowcoverings_set = value >= 100 ? 1 : value / 100;
          if (this.getSetting('halfway') !== 0.5) {
            if (windowcoverings_set < this.getSetting('halfway')) {
              windowcoverings_set = 0.5 * windowcoverings_set / this.getSetting('halfway');
            } else {
              windowcoverings_set = windowcoverings_set - (1 - (windowcoverings_set - this.getSetting('halfway')) * (1 / (1 - this.getSetting('halfway')))) * (this.getSetting('halfway') - 0.5);
            };
          };
          if (windowcoverings_set != this.getCapabilityValue('windowcoverings_set')) {
            this.setCapabilityValue('windowcoverings_set', windowcoverings_set);
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
          let alarm_generic = value === 0 ? false : true;
          if (alarm_generic != this.getCapabilityValue('alarm_generic')) {
            this.setCapabilityValue('alarm_generic', alarm_generic);
          }
          break;
        case 'input1':
          let alarm_generic_1 = value === 0 ? false : true;
          if (alarm_generic_1 != this.getCapabilityValue('alarm_generic.1')) {
            this.setCapabilityValue('alarm_generic.1', alarm_generic_1);
          }
          break;
        case 'rollerStopReason':
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
    return await this.util.removeCallbackEvents('/settings/roller/0?', temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

}

module.exports = Shelly2RollerShutterDevice;
