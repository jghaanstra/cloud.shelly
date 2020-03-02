'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class ShellyDimmerDevice extends Homey.Device {

  onInit() {
    new Homey.FlowCardTriggerDevice('triggerDimmerInput1').register();
    new Homey.FlowCardTriggerDevice('triggerDimmerInput2').register();

    var interval = this.getSetting('polling') || 5;
    this.pollDevice(interval);
    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', (value, opts) => {
      if (value) {
        return util.sendCommand('/light/0?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return util.sendCommand('/light/0?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

    this.registerCapabilityListener('dim', (value, opts) => {
      if (!this.getCapabilityValue('onoff')) {
        this.setCapabilityValue('onoff', true);
      }
      var dim = value * 100;
      return util.sendCommand('/light/0?brightness='+ dim +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });
  }

  onDeleted() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);
  }

  // HELPER FUNCTIONS
  pollDevice(interval) {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
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
            Homey.ManagerFlow.getCard('trigger', 'triggerDimmerInput1').trigger(this, {'status': status}, {});
          }

          // capability onoff.input2
          if (input2 != this.getCapabilityValue('onoff.input2')) {
            this.setCapabilityValue('onoff.input2', input2);
            var status = input2 == true ? "On" : "Off";
            Homey.ManagerFlow.getCard('trigger', 'triggerDimmerInput2').trigger(this, {'status': status}, {});
          }

        })
        .catch(error => {
          this.log(error);
          this.setUnavailable(Homey.__('Unreachable'));
          this.pingDevice();
        })
    }, 1000 * interval);
  }

  pingDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          this.setAvailable();
          var interval = this.getSetting('polling') || 5;
          this.pollDevice(interval);
        })
        .catch(error => {
          this.log('Device is not reachable, pinging every 63 seconds to see if it comes online again.');
        })
    }, 63000);
  }

}

module.exports = ShellyDimmerDevice;
