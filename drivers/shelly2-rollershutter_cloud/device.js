'use strict';

const Homey = require('homey');
const Device = require('../device_cloud.js');
const Util = require('../../lib/util.js');

class Shelly2RollerShutterCloudDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Changed');
    this.homey.flow.getDeviceTriggerCard('triggerInput2On');
    this.homey.flow.getDeviceTriggerCard('triggerInput2Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput2Changed');

    this.setAvailable();

    // INITIAL UPDATE AND POLLING
    this.bootSequence();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('windowcoverings_state', async (value) => {
      if (value !== 'idle' && value !== this.getStoreValue('last_action')) {
        this.setStoreValue('last_action', value);
      }

      if (value == 'idle') {
        return await this.util.sendCloudCommand('/device/relay/roller/control/', this.getSetting('server_address'), this.getSetting('cloud_token'), this.getSetting('device_id'), {"direction": "stop"});
      } else if (value == 'up') {
        return await this.util.sendCloudCommand('/device/relay/roller/control/', this.getSetting('server_address'), this.getSetting('cloud_token'), this.getSetting('device_id'), {"direction": "open"});
      } else if (value == 'down') {
        return await this.util.sendCloudCommand('/device/relay/roller/control/', this.getSetting('server_address'), this.getSetting('cloud_token'), this.getSetting('device_id'), {"direction": "close"});
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
      return await this.util.sendCloudCommand('/device/relay/roller/settings/topos/', this.getSetting('server_address'), this.getSetting('cloud_token'), this.getSetting('device_id'), {"pos": Math.round(position*100)});
    });

    this.registerCapabilityListener('button.sethalfwayposition', async () => {
      try {
        let data = await this.util.sendCloudCommand('/device/status', this.getSetting('server_address'), this.getSetting('cloud_token'), this.getSetting('device_id'));
        let result = data.data.device_status;
        let position = result.rollers[0].current_pos >= 100 ? 1 : result.rollers[0].current_pos / 100;
        this.setSettings({'halfway':  position});
        return Promise.resolve(true);
      } catch (error) {
        this.log(error);
        return Promise.reject(error);
      }
    });

  }

}

module.exports = Shelly2RollerShutterCloudDevice;
