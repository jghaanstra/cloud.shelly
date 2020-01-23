"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class Shelly1Driver extends Homey.Driver {

  onPair(socket) {
    const discoveryStrategy = this.getDiscoveryStrategy();
    const discoveryResults = discoveryStrategy.getDiscoveryResults();
    let selectedDeviceId;
    let deviceArray = {};

    socket.on('list_devices', (data, callback) => {
      const devices = Object.values(discoveryResults).map(discoveryResult => {
        return {
          name: 'Shelly1 ['+ discoveryResult.address +']',
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

    socket.on('get_device', (data, callback) => {
      const discoveryResult = discoveryResults[selectedDeviceId];
      if(!discoveryResult) return callback(new Error('Something went wrong'));

      util.sendCommand('/shelly', discoveryResult.address, data.username, data.password)
        .then(result => {
          console.log('device details retrieved with discoveryresult ID');
          this.log(result);
          deviceArray = {
            name: 'Shelly1 ['+ discoveryResult.address +']',
            data: {
              id: discoveryResult.id,
            },
            settings: {
              address  : discoveryResult.address,
              username : '',
              password : '',
              polling  : 5
            },
            store: {
              type: result.type,
              outputs: result.num_outputs
            }
          }
          if (result.auth) {
            console.log('auth is needed');
            this.log(deviceArray);
            socket.nextView();
          } else {
            console.log('auth is not needed');
            this.log(deviceArray);
            socket.showView('add_device');
          }
        })
        .catch(error => {
          this.log(error);
          callback(error, false);
        })
    });

    socket.on('login', (data, callback) => {
      this.log('calling login event');
      this.log(deviceArray);
      deviceArray.settings.username = data.username;
      deviceArray.settings.password = data.password;
      callback(null, true);
    });

    socket.on('add_device', (data, callback) => {
      callback(false, deviceArray);
    });

  }

}

module.exports = Shelly1Driver;
