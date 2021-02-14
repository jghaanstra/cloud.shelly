'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');

class Shelly1lDriver extends Homey.Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});
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
          name: 'Shelly 1L ['+ discoveryResult.address +']',
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
          name: 'Shelly 1L ['+ discoveryResult.address +']',
          data: {
            id: discoveryResult.id,
          },
          settings: {
            address  : discoveryResult.address,
            username : '',
            password : ''
          },
          capabilities: ["onoff", "measure_power", "meter_power", "measure_temperature", "alarm_generic", "alarm_generic.1"],
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
        if (hostname.startsWith('shelly1l-')) {
          deviceArray = {
            name: 'Shelly 1L ['+ data.address +']',
            data: {
              id: result.device.hostname,
            },
            settings: {
              address  : data.address,
              username : data.username,
              password : data.password
            },
            capabilities: ["onoff", "measure_power", "meter_power", "measure_temperature", "alarm_generic"],
            store: {
              type: result.device.type
            }
          }
          return Promise.resolve(deviceArray);
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

}

module.exports = Shelly1lDriver;
