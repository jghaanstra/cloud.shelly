'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [
  'roller_open',
  'roller_close',
  'roller_stop'
];

class Shelly2RollerShutterDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.pollDevice();
    this.setAvailable();

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

    this.registerCapabilityListener('button.callbackevents', async () => {
      return await this.util.addCallbackEvents('/settings/roller/0?', callbacks, 'shelly2-rollershutter', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      return await this.util.removeCallbackEvents('/settings/roller/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  /*async onAdded() {
    return await this.util.addCallbackEvents('/settings/roller/0?', callbacks, 'shelly2-rollershutter', this.getData().id, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }*/

  async onDeleted() {
    try {
      clearInterval(this.pollingInterval);
      clearInterval(this.pingInterval);
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await this.util.removeCallbackEvents('/settings/roller/0?', callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
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
        let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'), 'polling');
        clearTimeout(this.offlineTimeout);

        if ( result.rollers[0].state == 'stop' ) {
          var state = 'idle';
        } else if ( result.rollers[0].state == 'open' ) {
          var state = 'up';
        } else if ( result.rollers[0].state == 'close' ) {
          var state = 'down';
        }
        if (state !== 'idle' && state !== this.getStoreValue('last_action')) {
          this.setStoreValue('last_action', state);
        }

        var power = result.rollers[0].power;
        var position = result.rollers[0].current_pos >= 100 ? 1 : result.rollers[0].current_pos / 100;

        if (this.getSetting('halfway') !== 0.5) {
          if (position < this.getSetting('halfway')) {
            var position = 0.5 * position / this.getSetting('halfway');
          } else {
            var position = position - (1 - (position-this.getSetting('halfway')) * (1 / (1 - this.getSetting('halfway')))) * (this.getSetting('halfway') - 0.5);
          };
        };

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

module.exports = Shelly2RollerShutterDevice;
