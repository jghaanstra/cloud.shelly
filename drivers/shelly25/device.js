'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class Shelly25Device extends Homey.Device {

  onInit() {
    new Homey.FlowCardTriggerDevice('triggerMeterPowerFactor').register();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', (value, opts) => {
      Homey.ManagerDrivers.getDriver('shelly25').updateTempDevices(this.getData().id, 'onoff', value);
      if (value) {
        return util.sendCommand('/relay/'+ this.getStoreValue('channel') +'?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return util.sendCommand('/relay/'+ this.getStoreValue('channel') +'?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });
  }

  onDeleted() {
    return Homey.ManagerDrivers.getDriver('shelly25').loadDevices();
  }

}

module.exports = Shelly25Device;
