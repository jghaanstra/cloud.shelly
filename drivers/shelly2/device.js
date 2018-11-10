'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class Shelly2Device extends Homey.Device {

  onInit() {
    new Homey.FlowCardTriggerDevice('relay0OnTrigger').register();
    new Homey.FlowCardTriggerDevice('relay1OnTrigger').register();
    new Homey.FlowCardTriggerDevice('relay0OffTrigger').register();
    new Homey.FlowCardTriggerDevice('relay1OffTrigger').register();

    this.registerCapabilityListener('onoff.relay0', this.onCapabilityOnoff0.bind(this));
    this.registerCapabilityListener('onoff.relay1', this.onCapabilityOnoff1.bind(this));

    var interval = this.getSetting('polling') || 5;

    this.pollDevice(interval);
  }

  onDeleted() {
    clearInterval(this.pollingInterval);
  }

  // LISTENERS FOR UPDATING CAPABILITIES
  onCapabilityOnoff0(value, opts, callback) {
    if (value) {
      util.sendCommand('/relay/0?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    } else {
      util.sendCommand('/relay/0?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    }
    callback(null, value);
  }

  // LISTENERS FOR UPDATING CAPABILITIES
  onCapabilityOnoff1(value, opts, callback) {
    if (value) {
      util.sendCommand('/relay/1?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    } else {
      util.sendCommand('/relay/1?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    }
    callback(null, value);
  }

  // HELPER FUNCTIONS
  pollDevice(interval) {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          var state0 = result.relays[0].ison;
          var state1 = result.relays[1].ison;
          var power = result.meters[0].power;

          // capability onoff relay 0
          if (state0 != this.getCapabilityValue('onoff.relay0')) {
            this.setCapabilityValue('onoff.relay0', state0);

            if (state0) {
              Homey.ManagerFlow.getCard('trigger', 'relay0OnTrigger').trigger(this, {}, {})
            } else {
              Homey.ManagerFlow.getCard('trigger', 'relay0OffTrigger').trigger(this, {}, {})
            }
          }

          // capability onoff relay 1
          if (state1 != this.getCapabilityValue('onoff.relay1')) {
            this.setCapabilityValue('onoff.relay1', state1);

            if (state1) {
              Homey.ManagerFlow.getCard('trigger', 'relay1OnTrigger').trigger(this, {}, {})
            } else {
              Homey.ManagerFlow.getCard('trigger', 'relay1OffTrigger').trigger(this, {}, {})
            }
          }

          // capability measure_power
          if (power != this.getCapabilityValue('measure_power')) {
            this.setCapabilityValue('measure_power', power);
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

module.exports = Shelly2Device;
