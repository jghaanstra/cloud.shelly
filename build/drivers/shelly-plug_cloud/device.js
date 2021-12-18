'use strict';

const Homey = require('homey');
const Device = require('../device_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPlugCloudDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.homey.flow.getDeviceTriggerCard('triggerOverpowered'); // TODO: card is deprecated, remove after some time.

    this.setAvailable();

    // INITIAL UPDATE AND POLLING
    this.bootSequence();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      const onoff = value ? 'on' : 'off';
      return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'relay', command_param: 'turn', command_value: onoff, deviceid: this.getSetting('cloud_device_id'), channel: this.getStoreValue('channel')})]);
    });

  }

}

module.exports = ShellyPlugCloudDevice;
