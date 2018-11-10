"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class Shelly2RollerShutterDriver extends Homey.Driver {

  onPair(socket) {
    socket.on('testConnection', function(data, callback) {
      util.sendCommand('/settings', data.address, data.username, data.password)
        .then(result => {
          callback(false, result);
        })
        .catch(error => {
          callback(error, false);
        })
    });
  }

}

module.exports = Shelly2RollerShutterDriver;
