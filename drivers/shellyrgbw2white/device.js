'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class ShellyRGBW2WhiteDevice extends Homey.Device {

  onInit() {

    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', (value, opts) => {
      Homey.ManagerDrivers.getDriver('shellyrgbw2white').updateTempDevices(this.getData().id, 'onoff', value);
      if (value) {
        return util.sendCommand('/white/'+ this.getStoreValue('channel') +'?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return util.sendCommand('/white/'+ this.getStoreValue('channel') +'?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

    this.registerCapabilityListener('dim', (value, opts) => {
      var dim = value * 100;
      Homey.ManagerDrivers.getDriver('shellyrgbw2white').updateTempDevices(this.getData().id, 'dim', value);
      return util.sendCommand('/white/'+ this.getStoreValue('channel') +'?brightness='+ dim +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

  }

  onDeleted() {
    return Homey.ManagerDrivers.getDriver('shellyrgbw2white').loadDevices();
  }

}

module.exports = ShellyRGBW2WhiteDevice;
