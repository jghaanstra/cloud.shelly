"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class Shelly2Driver extends Homey.Driver {

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

module.exports = Shelly2Driver;
