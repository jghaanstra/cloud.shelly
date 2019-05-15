"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class Shelly25Driver extends Homey.Driver {

  onPair(socket) {
    socket.on('testConnection', function(data, callback) {
      console.log('testing connection');
      util.sendCommand('/shelly', data.address, data.username, data.password)
        .then(result => {
          console.log(result);
          callback(false, result);
        })
        .catch(error => {
          console.log(error);
          callback(error, false);
        })
    });
  }

}

module.exports = Shelly25Driver;
