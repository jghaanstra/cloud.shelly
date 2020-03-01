"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');
var added_devices = {};
var temp_devices = {};

class Shelly2Driver extends Homey.Driver {

  onInit() {
    this.loadDevices();
    this.pollDevices(5);
  }

  onPair(socket) {
    const discoveryStrategy = this.getDiscoveryStrategy();
    const discoveryResults = discoveryStrategy.getDiscoveryResults();
    let selectedDeviceId;
    let deviceArray = {};

    socket.on('list_devices', (data, callback) => {
      const devices = Object.values(discoveryResults).map(discoveryResult => {
        return {
          name: 'Shelly2 ['+ discoveryResult.address +']',
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

      util.sendCommand('/shelly', discoveryResult.address, '', '')
        .then(result => {
          deviceArray = {
            name: 'Shelly2 ['+ discoveryResult.address +']',
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
      this.loadDevices();
      this.pollDevices(5);
      callback(false, deviceArray);
    });

  }

  // HELPER FUNCTIONS
  loadDevices() {
    added_devices = Homey.ManagerDrivers.getDriver('shelly2').getDevices();
    this.updateDevices(2);
    return true;
  }

  pollDevices(interval) {
    clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(() => {

      try {
        if (added_devices.length > 0) {
          Object.keys(added_devices).forEach((key) => {

            if (added_devices[key].getStoreValue("channel") == 0) {
              var device0_id = added_devices[key].getData().id;
              var device1_id = added_devices[key].getStoreValue('main_device') + "-channel-1";

              util.sendCommand('/status', added_devices[key].getSetting('address'), added_devices[key].getSetting('username'), added_devices[key].getSetting('password'))
                .then(result => {

                  temp_devices[device0_id] = {
                    id: device0_id,
                    onoff: result.relays[0].ison,
                    measure_power: result.meters[0].power,
                    meter_power: result.meters[0].total,
                    measure_voltage: result.meters[0].voltage,
                    online: true
                  }

                  temp_devices[device1_id] = {
                    id: device1_id,
                    onoff: result.relays[1].ison,
                    measure_power: result.meters[0].power,
                    meter_power: result.meters[0].total,
                    measure_voltage: result.meters[0].voltage,
                    online: true
                  }
                })
                .catch(error => {
                  this.log(error);
                  if (temp_devices[device0_id].online == true) {
                    temp_devices[device0_id].online = false;
                  }
                  if (temp_devices[device1_id].online == true) {
                    temp_devices[device1_id].online = false;
                  }
                })
            }

          });

        } else {
          clearInterval(this.pollingInterval);
        }

      } catch (error) {
        this.log(error);
      }
    }, 1000 * interval);
  }

  updateDevices(interval) {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      try {
        if (added_devices.length > 0) {
          Object.keys(added_devices).forEach((key) => {
            if (temp_devices.hasOwnProperty(added_devices[key].getData().id)) {
              if (temp_devices[added_devices[key].getData().id].online == true) {

                if (!added_devices[key].getAvailable()) {
                  added_devices[key].setAvailable();
                }

                // capability onoff
                if (temp_devices[added_devices[key].getData().id].onoff != added_devices[key].getCapabilityValue('onoff')) {
                  added_devices[key].setCapabilityValue('onoff', temp_devices[added_devices[key].getData().id].onoff);
                }
                // capability measure_power
                if (temp_devices[added_devices[key].getData().id].measure_power != added_devices[key].getCapabilityValue('measure_power')) {
                  added_devices[key].setCapabilityValue('measure_power', temp_devices[added_devices[key].getData().id].measure_power);
                }
                // capability meter_power
                if (temp_devices[added_devices[key].getData().id].meter_power != added_devices[key].getCapabilityValue('meter_power')) {
                  added_devices[key].setCapabilityValue('meter_power', temp_devices[added_devices[key].getData().id].meter_power);
                }
                // capability measure_voltage
                if (temp_devices[added_devices[key].getData().id].measure_voltage != added_devices[key].getCapabilityValue('measure_voltage')) {
                  added_devices[key].setCapabilityValue('measure_voltage', temp_devices[added_devices[key].getData().id].measure_voltage);
                }
              } else {
                added_devices[key].setUnavailable(Homey.__('Unreachable'));
              }

            }
          });
        } else {
          clearInterval(this.updateInterval);
        }
      } catch (error) {
        this.log(error);
      }

    }, 1000 * interval);
  }

  updateTempDevices(device_id, capability, state) {
    temp_devices[device_id][capability] = state;
  }

}

module.exports = Shelly2Driver;
