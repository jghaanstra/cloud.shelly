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
      this.log('list_devices');
      const devices = Object.values(discoveryResults).map(discoveryResult => {
        return {
          name: 'Shelly1 ['+ discoveryResult.address +']',
          data: {
            id: discoveryResult.id,
          }
        };
      });
      this.log(devices);
      callback(null, devices);
    });

    socket.on('list_devices_selection', (data, callback) => {
      this.log('list_devices_selection');
      callback();
      selectedDeviceId = data[0].data.id;
    });

    socket.on('get_device', (data, callback) => {
      this.log('get_device');
      const discoveryResult = discoveryResults[selectedDeviceId];
      if(!discoveryResult) return callback(new Error('Something went wrong'));

      util.sendCommand('/shelly', discoveryResult.address, data.username, data.password)
        .then(result => {
          this.log('get_device sendCommand() with ID: ', selectedDeviceId);
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
            this.log('auth is needed');
            this.log(deviceArray);
            socket.nextView();
          } else {
            this.log('auth is not needed');
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
      this.log('login');
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
