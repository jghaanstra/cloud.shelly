'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class Shelly2RollerShutterDevice extends Homey.Device {

  onInit() {
    this.pollDevice();
    this.setAvailable();

    // ADD MISSING CAPABILITIES
    if (!this.hasCapability('button.sethalfwayposition')) {
      this.addCapability('button.sethalfwayposition');
    }

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('windowcoverings_state', (value, opts) => {
      if (value == 'idle') {
        return util.sendCommand('/roller/0?go=stop', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else if (value == 'up') {
        return util.sendCommand('/roller/0?go=open', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else if (value == 'down') {
        return util.sendCommand('/roller/0?go=close', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return Promise.reject('State not recognized ...');
      }
    });

    this.registerCapabilityListener('windowcoverings_set', (value, opts) => {
      console.log('requested position:', value);
      console.log('saved halfway setting:', this.getSetting('halfway'));
      if (this.getSetting('halfway') != 0.5) {
        var position = (((1 - (2 * Math.abs(0.5 - value))) * ((this.getSetting('halfway') - 50 ) / 100)) * 100);
        console.log('newly calculated position based on optical middle:', position);
      } else {
        var position = value * 100;
      }

      return util.sendCommand('/roller/0?go=to_pos&roller_pos='+ position, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.sethalfwayposition', async () => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          var position = result.rollers[0].current_pos >= 100 ? 1 : result.rollers[0].current_pos / 100;
          console.log('setting optical middle to:', position);
          this.setSettings({'halfway':  position});
          return true;
        })
        .catch(error => {
          this.log(error);
          return false;
        })
    });

  }

  onDeleted() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);
  }

  // HELPER FUNCTIONS
  pollDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          clearTimeout(this.offlineTimeout);

          if ( result.rollers[0].state == 'stop' ) {
            var state = 'idle';
          } else if ( result.rollers[0].state == 'open' ) {
            var state = 'up';
          } else if ( result.rollers[0].state == 'close' ) {
            var state = 'down';
          }
          var power = result.rollers[0].power;
          var position = result.rollers[0].current_pos >= 100 ? 1 : result.rollers[0].current_pos / 100;

          // capability windowcoverings_state
          if (state != this.getCapabilityValue('windowcoverings_state')) {
            this.setCapabilityValue('windowcoverings_state', state);
          }

          // capability measure_power
          if (power != this.getCapabilityValue('measure_power')) {
            this.setCapabilityValue('measure_power', power);
          }

          // capability windowcoverings_set
          if (position != this.getCapabilityValue('windowcoverings_set')) {
            this.setCapabilityValue('windowcoverings_set', position);
          }

        })
        .catch(error => {
          this.log(error);
          this.setUnavailable(Homey.__('Unreachable'));
          this.pingDevice();

          this.offlineTimeout = setTimeout(() => {
            let offlineTrigger = new Homey.FlowCardTrigger('triggerDeviceOffline');
            offlineTrigger.register().trigger({"device": this.getName(), "device_error": error.toString() });
            return;
          }, 60000 * this.getSetting('offline'));
        })
    }, 1000 * this.getSetting('polling'));
  }

  pingDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          this.setAvailable();
          this.pollDevice();
        })
        .catch(error => {
          this.log('Device is not reachable, pinging every 63 seconds to see if it comes online again.');
        })
    }, 63000);
  }

}

module.exports = Shelly2RollerShutterDevice;
