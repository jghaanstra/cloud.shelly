'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
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

    this.homey.flow.getDeviceTriggerCard('triggerDimmerInput1');
    this.homey.flow.getDeviceTriggerCard('triggerDimmerInput2');

    this.pollDevice();
    this.setAvailable();

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

    this.registerCapabilityListener('button.callbackevents', async () => {
      return await this.util.addCallbackEvents('/settings/light/0?', callbacks, 'shellydimmer', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await this.util.removeCallbackEvents('/settings/light/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  /*async onAdded() {
    return await this.util.addCallbackEvents('/settings/light/0?', callbacks, 'shellydimmer', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }*/

  async onDeleted() {
    try {
      clearInterval(this.pollingInterval);
      clearInterval(this.pingInterval);
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await this.util.removeCallbackEvents('/settings/light/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await this.util.removeIcon(iconpath);
      return;
    } catch (error) {
      this.log(error);
    }
  }

  // HELPER FUNCTIONS
  pollDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(async () => {
      try {
        let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        clearTimeout(this.offlineTimeout);

        let state = result.lights[0].ison;
        let power = result.meters[0].power;
        let total_consumption = result.meters[0].total;
        let meter_power = total_consumption * 0.000017;
        let dim = Number(result.lights[0].brightness) / 100;
        let temperature = result.tmp.tC;
        let input1 = result.inputs[0].input == 1 ? true : false;
        let input2 = result.inputs[1].input == 1 ? true : false;

        // capability onoff
        if (state != this.getCapabilityValue('onoff')) {
          this.setCapabilityValue('onoff', state);
        }

        // capability measure_power
        if (power != this.getCapabilityValue('measure_power')) {
          this.setCapabilityValue('measure_power', power);
        }

        // capability meter_power_wmin
        if (total_consumption != this.getCapabilityValue('meter_power_wmin')) {
          this.setCapabilityValue('meter_power_wmin', total_consumption);
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
        if (temperature != this.getCapabilityValue('measure_temperature')) {
          this.setCapabilityValue('measure_temperature', temperature);
        }

        // capability onoff.input1
        if (input1 != this.getCapabilityValue('onoff.input1')) {
          this.setCapabilityValue('onoff.input1', input1);
          var status = input1 == true ? "On" : "Off";
          this.homey.flow.getDeviceTriggerCard('triggerDimmerInput1').trigger(this, {'status': status}, {});
        }

        // capability onoff.input2
        if (input2 != this.getCapabilityValue('onoff.input2')) {
          this.setCapabilityValue('onoff.input2', input2);
          var status = input2 == true ? "On" : "Off";
          this.homey.flow.getDeviceTriggerCard('triggerDimmerInput2').trigger(this, {'status': status}, {});
        }
      } catch (error) {
        this.log(error);
        this.setUnavailable(this.homey.__('device.unreachable') + error.message);
        this.pingDevice();

        this.offlineTimeout = setTimeout(() => {
          this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": this.getName(), "device_error": error.toString()});
        }, 60000 * this.getSetting('offline'));
      }

    }, 1000 * this.getSetting('polling'));
  }

  pingDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pingInterval = setInterval(async () => {
      try {
        let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 'polling');
        this.setAvailable();
        this.pollDevice();
      } catch (error) {
        this.log('Device is not reachable, pinging every 63 seconds to see if it comes online again.');
      }
    }, 63000);
  }

  getCallbacks() {
    return callbacks;
  }

}

module.exports = ShellyDimmerDevice;
