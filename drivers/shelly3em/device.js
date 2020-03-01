'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class Shelly3EmDevice extends Homey.Device {

  onInit() {
    new Homey.FlowCardTriggerDevice('triggerMeterPowerConsumed').register();
    new Homey.FlowCardTriggerDevice('triggerMeterPowerReturned').register();
    new Homey.FlowCardTriggerDevice('triggerMeterPowerFactor').register();

    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', (value, opts) => {
      Homey.ManagerDrivers.getDriver('shelly3em').updateTempDevices(this.getData().id, 'onoff', value);
      if (value) {
        return util.sendCommand('/relay/0?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return util.sendCommand('/relay/0?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });
  }

  onDeleted() {
    return Homey.ManagerDrivers.getDriver('shelly3em').loadDevices();
  }

}

module.exports = Shelly3EmDevice;
