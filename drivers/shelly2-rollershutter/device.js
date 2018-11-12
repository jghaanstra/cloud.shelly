'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class Shelly2RollerShutterDevice extends Homey.Device {

  onInit() {

    this.registerCapabilityListener('windowcoverings_state.relay0', this.onCapabilityWindowcoveringsState.bind(this));

    var interval = this.getSetting('polling') || 5;

    this.pollDevice(interval);
  }

  onDeleted() {
    clearInterval(this.pollingInterval);
  }

  // LISTENERS FOR UPDATING CAPABILITIES
  onCapabilityWindowcoveringsState(value, opts, callback) {
    console.log('windowcoveringstate_capability set to: ', value);
    if (value == 'idle') {
      util.sendCommand('/roller/0?go=stop', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    } else if (value == 'up') {
      util.sendCommand('/roller/0?go=open', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    } else if (value == 'down') {
      util.sendCommand('/roller/0?go=close', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
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

          console.log(result.rollers);
          console.log('rollers[0].state is: ', result.rollers[0].state);
          if ( result.rollers[0].state == 'stop' ) {
            var state = 'idle';
          } else if ( result.rollers[0].state == 'open' ) {
            var state = 'up';
          } else if ( result.rollers[0].state == 'close' ) {
            var state = 'down';
          }
          var power = result.meters[0].power;

          // capability windowcoverings_state
          if (state != this.getCapabilityValue('windowcoverings_state')) {
            this.setCapabilityValue('windowcoverings_state', state);
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
