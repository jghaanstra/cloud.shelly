'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class Shelly4ProDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    if (this.getStoreValue('communication') === 'websocket') {
      this.callbacks = [
        'shortpush',
        'longpush'
      ];
    } else {
      this.callbacks = [];
    }

    this.setAvailable();

    this.bootSequence();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      if (this.getStoreValue('communication') === 'websocket') {
        if (this.getStoreValue('channel') === 0) {
          this.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Switch.Set", "params": {"id": this.getStoreValue('channel'), "on": value} }));
        } else {
          const device_id = this.getStoreValue('main_device') + '-channel-0';
          const device = this.driver.getDevice({id: device_id });
          device.ws.send(JSON.stringify({"id": device.getCommandId(), "method": "Switch.Set", "params": {"id": this.getStoreValue('channel'), "on": value} }));
        }
      } else {
        const path = value ? '/relay/'+ this.getStoreValue("channel") +'?turn=on' : '/relay/'+ this.getStoreValue("channel") +'?turn=off';
        return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

  }

}

module.exports = Shelly4ProDevice;
