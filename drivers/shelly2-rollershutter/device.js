'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class Shelly2RollerShutterDevice extends Homey.Device {

  onInit() {

    this.registerCapabilityListener('windowcoverings_state.relay0', this.onCapabilityWindowcoveringsState0.bind(this));
    this.registerCapabilityListener('windowcoverings_state.relay1', this.onCapabilityWindowcoveringsState1.bind(this));

    var interval = this.getSetting('polling') || 5;

    this.pollDevice(interval);
  }

  onDeleted() {
    clearInterval(this.pollingInterval);
  }

  // LISTENERS FOR UPDATING CAPABILITIES
  onCapabilityWindowcoveringsState0(value, opts, callback) {
    if ( value== 'idle') {
      util.sendCommand('/rollers/0?go=stop', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    } else if (value == 'up') {
      util.sendCommand('/rollers/0?go=open', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    } else if (value == 'down') {
      util.sendCommand('/rollers/0?go=close', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    }
    callback(null, value);
  }

  // LISTENERS FOR UPDATING CAPABILITIES
  onCapabilityWindowcoveringsState1(value, opts, callback) {
    if ( value== 'idle') {
      util.sendCommand('/rollers/1?go=stop', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    } else if (value == 'up') {
      util.sendCommand('/rollers/1?go=open', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    } else if (value == 'down') {
      util.sendCommand('/rollers/1?go=close', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
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
          if ( result.rollers[0].state == 'stop' ) {
            var state0 = 'idle';
          } else if ( result.rollers[0].state == 'open' ) {
            var state0 = 'up';
          } else if ( result.rollers[0].state == 'close' ) {
            var state0 = 'down';
          }
          if ( result.rollers[1].state == 'stop' ) {
            var state1 = 'idle';
          } else if ( result.rollers[1].state == 'open' ) {
            var state1 = 'up';
          } else if ( result.rollers[1].state == 'close' ) {
            var state1 = 'down';
          }
          var power = result.meters[0].power;

          // capability windowcoverings_state relay 0
          if (state0 != this.getCapabilityValue('windowcoverings_state.relay0')) {
            this.setCapabilityValue('windowcoverings_state.relay0', state0);
          }

          // capability windowcoverings_state relay 1
          if (state1 != this.getCapabilityValue('windowcoverings_state.relay1')) {
            this.setCapabilityValue('windowcoverings_state.relay1', state1);
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

module.exports = Shelly2RollerShutterDevice;
