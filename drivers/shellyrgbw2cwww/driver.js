'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');

class ShellyRGBW2CWWWDriver extends Homey.Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});
  }

  onPair(session) {
    session.on('testConnection', async (data) => {
      this.util.sendCommand('/shelly', data.address, data.username, data.password)
        .then(result => {
          callback(false, result);
        })
        .catch(error => {
          callback(error, false);
        })
    });
  }

}

module.exports = ShellyRGBW2CWWWDriver;
