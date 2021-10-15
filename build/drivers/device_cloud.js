'use strict';

const Homey = require('homey');
const Device = require('./device.js');
const Util = require('../lib/util.js');
const WebSocket = require('ws');
const tinycolor = require("tinycolor2");

class ShellyCloudDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.homey.setTimeout(async () => {
      return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Integrator:ActionRequest', deviceid: this.getSetting('cloud_device_id')})]);
    }, 2000);
  }

  async onAdded() {
    if (this.getStoreValue('channel') === 0 || this.getStoreValue('channel') == null) {
      this.homey.setTimeout(async () => {
        await this.homey.app.updateShellyCollection();
        await this.util.sleep(2000);
        await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Integrator:ActionRequest', deviceid: this.getSetting('cloud_device_id')})]);
        return;
      }, 2000);
    }
  }

  async onDeleted() {
    try {
      return await this.homey.app.updateShellyCollection();
    } catch (error) {
      this.log(error);
    }
  }

}

module.exports = ShellyCloudDevice;
