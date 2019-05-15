'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class Shelly2Device extends Homey.Device {

  onInit() {
    new Homey.FlowCardTriggerDevice('relay0OnTrigger').register();
    new Homey.FlowCardTriggerDevice('relay1OnTrigger').register();
    new Homey.FlowCardTriggerDevice('relay0OffTrigger').register();
    new Homey.FlowCardTriggerDevice('relay1OffTrigger').register();

    var interval = this.getSetting('polling') || 5;
    this.pollDevice(interval);

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff.relay0', (value, opts) => {
      if (value) {
        return util.sendCommand('/relay/0?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return util.sendCommand('/relay/0?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

    this.registerCapabilityListener('onoff.relay1', (value, opts) => {
      if (value) {
        return util.sendCommand('/relay/1?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return util.sendCommand('/relay/1?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });
  }

  onDeleted() {
    clearInterval(this.pollingInterval);
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

          console.log('polling');
          console.log(result.meters);

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
            this.setCapabilityValue('measure_power', 0);
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
