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
      if (devices.length) {
        callback(null, devices);
      } else {
        socket.showView('select_pairing');
      }
    });

    socket.on('list_devices_selection', (data, callback) => {
      callback();
      selectedDeviceId = data[0].data.id;
    });

    socket.on('get_device', (data, callback) => {
      const discoveryResult = discoveryResults[selectedDeviceId];
      if(!discoveryResult) return callback(new Error('Something went wrong'));

      util.sendCommand('/shelly', discoveryResult.address, '', '')
        .then(result => {
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
            capabilities: ['onoff', 'button.triggers', 'button.removetriggers'],
            store: {
              type: result.type,
              outputs: result.num_outputs
            }
          }
          if (result.auth) {
            socket.showView('login_credentials');
          } else {
            socket.showView('add_device');
          }
        })
        .catch(error => {
          callback(error, false);
        })
    });

    socket.on('login', (data, callback) => {
      deviceArray.settings.username = data.username;
      deviceArray.settings.password = data.password;
      callback(null, true);
    });

    socket.on('add_device', (data, callback) => {
      callback(false, deviceArray);
    });

    socket.on('testConnection', function(data, callback) {
      util.sendCommand('/shelly', data.address, data.username, data.password)
        .then(result => {
          callback(false, result);
        })
        .catch(error => {
          callback(error, false);
        })
    });

    socket.on('manual_pairing', (data, callback) => {
      util.sendCommand('/settings', data.address, data.username, data.password)
        .then(result => {
          deviceArray = {
            name: 'Shelly1 ['+ data.address +']',
            data: {
              id: result.device.hostname,
            },
            settings: {
              address  : data.address,
              username : data.username,
              password : data.password,
              polling  : data.polling
            },
            capabilities: ['onoff', 'button.triggers', 'button.removetriggers'],
            store: {
              type: data.shelly.type,
              outputs: data.shelly.num_outputs
            }
          }
          socket.showView('add_device');
        })
        .catch(error => {
          callback(error, false);
        })
    });

  }

}

module.exports = Shelly1Driver;
