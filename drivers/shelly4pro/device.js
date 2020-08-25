'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const callbacks = [];

class Shelly4ProDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      this.homey.drivers.getDriver('shelly4pro').updateTempDevices(this.getData().id, 'onoff', value);
      const path = value ? '/relay/'+ this.getStoreValue("channel") +'?turn=on' : '/relay/'+ this.getStoreValue("channel") +'?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onDeleted() {
    try {
      if (this.getStoreValue('channel') == 0) {
        const iconpath = "/userdata/" + this.getData().id +".svg";
        return await this.util.removeIcon(iconpath);
      }
      this.homey.drivers.getDriver('shelly4pro').loadDevices();
      return;
    } catch (error) {
      this.log(error);
    }
  }

  getCallbacks() {
    return callbacks;
  }

}

module.exports = Shelly4ProDevice;
