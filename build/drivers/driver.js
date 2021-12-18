'use strict';

const Homey = require('homey');
const Util = require('../lib/util.js');

class ShellyDriver extends Homey.Driver {

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
          name: this.config.name+ ' ['+ discoveryResult.address +']',
          data: {
            id: discoveryResult.host
          }
        };
      });
      if (devices.length) {
        return devices;
      } else {
        session.showView('select_pairing');
      }
    });

    session.setHandler('list_devices_selection', async (data) => {
      return selectedDeviceId = data[0].data.id;
    });

    session.setHandler('get_device', async (data) => {
      try {
        const discoveryResult = discoveryResults[selectedDeviceId];

        if (discoveryResult.txt !== undefined) {
          if (discoveryResult.txt.gen === '2') {
            var result = await this.util.sendCommand('/rpc/Shelly.GetDeviceInfo', discoveryResult.address, '', '');
            var type = result.model;
            var communication = 'websocket';
          } else {
            var result = await this.util.sendCommand('/shelly', discoveryResult.address, '', '');
            var type = result.type;
            var communication = 'coap';
          }
        } else {
          var result = await this.util.sendCommand('/shelly', discoveryResult.address, '', '');
          var type = result.type;
          var communication = 'coap';
        }

        deviceArray = {
          name: this.config.name+ ' ['+ discoveryResult.address +']',
          data: {
            id: discoveryResult.host,
          },
          settings: {
            address  : discoveryResult.address,
            username : '',
            password : ''
          },
          store: {
            main_device: discoveryResult.host,
            channel: 0,
            type: type,
            unicast: false,
            battery: this.config.battery,
            sdk: 3,
            communication: communication
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

        if (data.generation === 'gen2') {
          var result = await this.util.sendCommand('/rpc/Shelly.GetDeviceInfo', data.address, '', '');
          var id = result.id;
          var type = result.model;
          var communication = 'websocket';
        } else {
          var result = await this.util.sendCommand('/settings', data.address, data.username, data.password);
          var id = result.device.hostname;
          var type = result.device.type;
          var communication = 'coap';
        }

        if (id.startsWith(this.config.hostname)) {
          deviceArray = {
            name: this.config.name+ ' ['+ data.address +']',
            data: {
              id: id,
            },
            settings: {
              address  : data.address,
              username : data.username,
              password : data.password
            },
            store: {
              main_device: id,
              channel: 0,
              type: type,
              unicast: false,
              battery: this.config.battery,
              sdk: 3,
              communication: communication
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

    session.setHandler('login', async (data) => {
      deviceArray.settings.username = data.username;
      deviceArray.settings.password = data.password;
      return Promise.resolve(true);
    });

    session.setHandler('add_device', async (data) => {
      try {
        if (deviceArray.store.communication === 'coap') {
          const unicast = await this.util.setUnicast(deviceArray.settings.address, deviceArray.settings.username, deviceArray.settings.password);
          deviceArray.store.unicast = true;
          return Promise.resolve(deviceArray);
        } else {
          return Promise.resolve(deviceArray);
        }
      } catch (error) {
        return Promise.reject(error);
      }
    });

    session.setHandler('setIcon', async (data) => {
      deviceIcon = data.icon;
      return Promise.resolve(true);
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

module.exports = ShellyDriver;
