'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');

class ShellyRGBW2WhiteDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', async (value) => {
      this.homey.drivers.getDriver('shellyrgbw2white').updateTempDevices(this.getData().id, 'onoff', value);
      const path = value ? '/white/'+ this.getStoreValue("channel") +'?turn=on' : '/white/'+ this.getStoreValue("channel") +'?turn=off';
      return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('dim', async (value) => {
      this.homey.drivers.getDriver('shellyrgbw2white').updateTempDevices(this.getData().id, 'dim', value);
      const dim = value * 100;
      return await this.util.sendCommand('/white/'+ this.getStoreValue('channel') +'?brightness='+ dim +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  async onDeleted() {
    try {
      if (this.getStoreValue('channel') == 0) {
        const iconpath = "/userdata/" + this.getData().id +".svg";
        await this.util.removeIcon(iconpath);
      }
      this.homey.drivers.getDriver('shellyrgbw2white').loadDevices();
      return;
    } catch (error) {
      this.log(error);
    }
  }

}

module.exports = ShellyRGBW2WhiteDevice;
