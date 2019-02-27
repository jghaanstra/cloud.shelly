"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class ShellyRGBW2ColorDriver extends Homey.Driver {

  onPair(socket) {
    socket.on('testConnection', function(data, callback) {
      util.sendCommand('/shelly', data.address, data.username, data.password)
        .then(result => {
          callback(false, result);
        })
        .catch(error => {
          callback(error, false);
        })
    });
  }

}

module.exports = ShellyRGBW2ColorDriver;
