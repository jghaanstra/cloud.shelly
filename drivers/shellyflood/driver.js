"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class ShellyFloodDriver extends Homey.Driver {

  onPair(socket) {
    const discoveryStrategy = this.getDiscoveryStrategy();
    const discoveryResults = discoveryStrategy.getDiscoveryResults();
    let selectedDeviceId;
    let deviceArray = {};

    socket.on('list_devices', (data, callback) => {
      const devices = Object.values(discoveryResults).map(discoveryResult => {
        return {
          name: 'Shelly Flood Sensor ['+ discoveryResult.address +']',
          data: {
            id: discoveryResult.id,
          }
        };
      });
      callback(null, devices);
    });

    socket.on('list_devices_selection', (data, callback) => {
      callback();
      selectedDeviceId = data[0].data.id;
    });

    socket.on('login', (data, callback) => {
      const discoveryResult = discoveryResults[selectedDeviceId];
      if(!discoveryResult) return callback(new Error('Something went wrong'));

      util.sendCommand('/shelly', discoveryResult.address, data.username, data.password)
        .then(result => {
          var password = data.password;
          deviceArray = {
            name: 'Shelly Flood Sensor ['+ discoveryResult.address +']',
            data: {
              id: discoveryResult.id,
            },
            settings: {
              address  : discoveryResult.address,
              username : data.username,
              password : data.password
            },
            store: {
              type: result.type,
              outputs: result.num_outputs
            }
          }
          callback(null, true);
        })
        .catch(error => {
          callback(error, false);
        })
    });

    socket.on('get_device', (data, callback) => {
      callback(false, deviceArray);
    });

  }

}

module.exports = ShellyFloodDriver;
