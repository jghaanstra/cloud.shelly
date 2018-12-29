"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class Shelly2RollerShutterDriver extends Homey.Driver {

  onPair(socket) {
    socket.on('testConnection', function(data, callback) {
      util.sendCommand('/shelly', data.address, data.username, data.password)
        .then(result => {
          console.log('testConnection succes');
          console.log(result);
          callback(false, result);
        })
        .catch(error => {
          console.log('testConnection error');
          console.log(error);
          callback(error, false);
        })
    });
  }

}

module.exports = Shelly2RollerShutterDriver;
