'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellyPro2PMDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [
      'shortpush',
      'longpush'
    ];

    this.homey.flow.getDeviceTriggerCard('triggerInput1On');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Off');
    this.homey.flow.getDeviceTriggerCard('triggerInput1Changed');
    //this.homey.flow.getDeviceTriggerCard('triggerOverpowered'); // TODO: card is deprecated, remove after some time. // TODO: enable this card (also under the csard config) when we can parse these notifications

    this.setAvailable();

    // INITIAL UPDATE AND POLLING
    this.bootSequence();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      if (this.getStoreValue('channel') === 0) {
        this.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Switch.Set", "params": {"id": this.getStoreValue('channel'), "on": value} }));
      } else {
        const device_id = this.getStoreValue('main_device') + '-channel-0';
        const device = this.driver.getDevice({id: device_id });
        device.ws.send(JSON.stringify({"id": device.getCommandId(), "method": "Switch.Set", "params": {"id": this.getStoreValue('channel'), "on": value} }));
      }
    });

  }

}

module.exports = ShellyPro2PMDevice;
