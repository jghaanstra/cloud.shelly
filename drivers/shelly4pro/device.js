'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class Shelly4ProDevice extends Homey.Device {

  onInit() {

    this.setAvailable();

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', (value, opts) => {
      Homey.ManagerDrivers.getDriver('shelly4pro').updateTempDevices(this.getData().id, 'onoff', value);
      if (value) {
        return util.sendCommand('/relay/'+ this.getStoreValue("channel") +'?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return util.sendCommand('/relay/'+ this.getStoreValue("channel") +'?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

  }

  onDeleted() {
    return Homey.ManagerDrivers.getDriver('shelly4pro').loadDevices();

    if (this.getStoreValue('channel') == 0) {
      const iconpath = "/userdata/" + this.getData().id +".svg";
      util.removeIcon(iconpath)
        .catch(error => {
          this.log(error);
        });
    }
  }

}

module.exports = Shelly4ProDevice;
