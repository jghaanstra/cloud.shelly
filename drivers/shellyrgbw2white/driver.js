'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
let added_devices = {};
let temp_devices = {};

class ShellyRGBW2WhiteDriver extends Homey.Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.loadDevices();
    this.pollDevices();
  }

  onPair(session) {
    const discoveryStrategy = this.getDiscoveryStrategy();
    const discoveryResults = discoveryStrategy.getDiscoveryResults();
    let selectedDeviceId;
    let deviceArray = {};
    let deviceIcon = 'icon.svg';

    session.setHandler('list_devices', async (data) => {
      const devices = Object.values(discoveryResults).map(discoveryResult => {
        return {
          name: 'Shelly RGBW2 White ['+ discoveryResult.address +']',
          data: {
            id: discoveryResult.id,
          }
        };
      });
      if (devices.length) {
        return devices;
      } else {
        session.showView('select_pairing');
      }
    });

    session.setHandler('get_device', async (data) => {
      try {
        const discoveryResult = discoveryResults[selectedDeviceId];
        if(!discoveryResult) return callback(new Error('Something went wrong'));

        const result = await this.util.sendCommand('/shelly', discoveryResult.address, '', '');
        deviceArray = {
          name: 'Shelly RGBW2 White ['+ discoveryResult.address +']',
          data: {
            id: discoveryResult.id,
          },
          settings: {
            address  : discoveryResult.address,
            username : '',
            password : ''
          },
          store: {
            type: result.type
          },
          icon: deviceIcon
        }
        if (result.auth) {
          session.showView('login_credentials');
        } else {
          session.showView('add_device');
        }
      } catch (error) {
        return Promise.reject(error);
      }
    });

    session.setHandler('manual_pairing', async (data) => {
      try {
        const result = await this.util.sendCommand('/settings', data.address, data.username, data.password);
        const hostname = result.device.hostname;
        if (hostname.startsWith('shellyrgbw2-')) {
          deviceArray = {
            name: 'Shelly RGBW2 White ['+ data.address +']',
            data: {
              id: result.device.hostname,
            },
            settings: {
              address  : data.address,
              username : data.username,
              password : data.password
            },
            store: {
              type: result.device.type
            }
          }
        } else {
          return Promise.reject(this.homey.__('driver.wrongdevice'));
        }
      } catch (error) {
        return Promise.reject(error);
      }
    });

    session.setHandler('list_devices_selection', async (data) => {
      return selectedDeviceId = data[0].data.id;
    });

    session.setHandler('login', async (data) => {
      deviceArray.settings.username = data.username;
      deviceArray.settings.password = data.password;
      return Promise.resolve(true);
    });

    session.setHandler('add_device', async (data) => {
      return Promise.resolve(deviceArray);
    });

    session.setHandler('save_icon', async (data) => {
      try {
        const result = await this.util.uploadIcon(data, selectedDeviceId);
        deviceIcon = "../../../userdata/"+ selectedDeviceId +".svg";
        return Promise.resolve(true);
      } catch (error) {
        return Promise.reject(error);
      }
    });

  }

  // HELPER FUNCTIONS
  loadDevices() {
    added_devices = this.getDevices();
    this.pollDevices();
    return;
  }

  pollDevices() {
    clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(async () => {
      if (added_devices.length > 0) {
        Object.keys(added_devices).forEach(async (key) => {
          if (added_devices[key].getStoreValue("channel") == 0) {
            try {
              let device0_id = added_devices[key].getData().id
              let device1_id = added_devices[key].getStoreValue('main_device') + "-channel-1";
              let device2_id = added_devices[key].getStoreValue('main_device') + "-channel-2";
              let device3_id = added_devices[key].getStoreValue('main_device') + "-channel-3";
              let result = await this.util.sendCommand('/status', added_devices[key].getSetting('address'), added_devices[key].getSetting('username'), added_devices[key].getSetting('password'));
              clearTimeout(this.offlineTimeout);

              let dim0 = result.lights[0].brightness > 100 ? 1 : result.lights[0].brightness / 100;
              let dim1 = result.lights[1].brightness > 100 ? 1 : result.lights[1].brightness / 100;
              let dim2 = result.lights[2].brightness > 100 ? 1 : result.lights[2].brightness / 100;
              let dim3 = result.lights[3].brightness > 100 ? 1 : result.lights[3].brightness / 100;

              temp_devices[device0_id] = {
                id: device0_id,
                onoff: result.lights[0].ison,
                dim: dim0,
                measure_power: result.meters[0].power,
                online: true
              }

              temp_devices[device1_id] = {
                id: device1_id,
                onoff: result.lights[1].ison,
                dim: dim1,
                measure_power: result.meters[1].power,
                online: true
              }

              temp_devices[device2_id] = {
                id: device1_id,
                onoff: result.lights[2].ison,
                dim: dim2,
                measure_power: result.meters[2].power,
                online: true
              }

              temp_devices[device3_id] = {
                id: device1_id,
                onoff: result.lights[3].ison,
                dim: dim3,
                measure_power: result.meters[3].power,
                online: true
              }
            } catch (error) {
              this.log(error);
              if (temp_devices.length > 0) {
                if (temp_devices[device0_id].online == true) {
                  temp_devices[device0_id].online = false;
                }
                if (temp_devices[device1_id].online == true) {
                  temp_devices[device1_id].online = false;
                }
                if (temp_devices[device2_id].online == true) {
                  temp_devices[device2_id].online = false;
                }
                if (temp_devices[device3_id].online == true) {
                  temp_devices[device3_id].online = false;
                }
              }
              this.offlineTimeout = setTimeout(() => {
                this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": added_devices[key].getName(), "device_error": error.toString()});
              }, 60000 * added_devices[key].getSetting('offline'));
            }
          }
        });
      } else {
        clearInterval(this.pollingInterval);
      }
    }, 5000);
  }

  updateDevices() {
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
                // capability dim
                if (temp_devices[added_devices[key].getData().id].dim != added_devices[key].getCapabilityValue('dim')) {
                  added_devices[key].setCapabilityValue('dim', temp_devices[added_devices[key].getData().id].dim);
                }
                // capability measure_power
                if (temp_devices[added_devices[key].getData().id].measure_power != added_devices[key].getCapabilityValue('measure_power')) {
                  added_devices[key].setCapabilityValue('measure_power', temp_devices[added_devices[key].getData().id].measure_power);
                }
              } else {
                added_devices[key].setUnavailable(this.homey.__('device.unreachable'));
              }

            }
          });
        }
      } catch (error) {
        this.log(error);
      }
    }, 2000);
  }

  updateTempDevices(device_id, capability, state) {
    if (temp_devices.hasOwnProperty(device_id)) {
      temp_devices[device_id][capability] = state;
    }
  }

}

module.exports = ShellyRGBW2WhiteDriver;
