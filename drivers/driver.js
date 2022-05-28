'use strict';

const Homey = require('homey');
const Util = require('../lib/util.js');
const semver = require('semver');

class ShellyDriver extends Homey.Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});
  }

  onPair(session) {
    const discoveryStrategy = this.getDiscoveryStrategy();
    const discoveryResults = discoveryStrategy.getDiscoveryResults();
    let unpairedShellies = 0;
    let selectedDeviceId;
    let deviceArray = {};
    let deviceIcon = 'icon.svg';

    session.setHandler('list_devices', async (data) => {
      try {
        const shellyDevices = await this.util.getShellies('collection');
        const devices = Object.values(discoveryResults).map(discoveryResult => {
          if (shellyDevices.length === 0) {
            unpairedShellies++
          } else if (shellyDevices.length > 0) {
            const pairedShelly = shellyDevices.filter(shelly => shelly.id.includes(discoveryResult.host));
            if (pairedShelly.length === 0) {
              unpairedShellies++
            }
          }
          return {
            name: this.config.name+ ' ['+ discoveryResult.address +']',
            data: {
              id: discoveryResult.host
            }
          };
        });
        if (unpairedShellies > 0) {
          return devices;
        } else {
          session.showView('select_pairing');
        }
      } catch (error) {
        this.error(error);
        return Promise.reject(error);
      }
    });

    session.setHandler('list_devices_selection', async (data) => {
      return selectedDeviceId = data[0].data.id;
    });

    session.setHandler('get_device', async (data) => {
      try {
        const discoveryResult = discoveryResults[selectedDeviceId];

        switch(this.config.gen) {
          case 'gen1':
            var result = await this.util.sendCommand('/shelly', discoveryResult.address, '', '');
            var auth = result.auth;
            var type = result.type;
            const regex = /(?<=\/v)(.*?)(?=\-)/gm;
            const version_data = regex.exec(result.fw);
            var fw_version = version_data[0];
            break;
          case 'gen2':
            var result = await this.util.sendCommand('/rpc/Shelly.GetDeviceInfo', discoveryResult.address, '', '');
            var auth = result.auth_en;
            var type = result.model;
            var fw_version = result.ver;
            break;
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
            wsserver: false,
            battery: this.config.battery,
            sdk: 3,
            gen: this.config.gen,
            communication: this.config.communication,
            fw_version: fw_version
          },
          icon: deviceIcon
        }
        if (auth) {
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
        switch(this.config.gen) {
          case 'gen1':
            var result = await this.util.sendCommand('/settings', data.address, data.username, data.password);
            var id = result.device.hostname;
            var type = result.device.type;
            const regex = /(?<=\/v)(.*?)(?=\-)/gm;
            const version_data = regex.exec(result.fw);
            var fw_version = version_data[0];
            break;
          case 'gen2':
            var result = await this.util.sendCommand('/rpc/Shelly.GetDeviceInfo', data.address, '', '');
            var id = result.id;
            var type = result.model;
            var fw_version = result.ver;
            break;
        }

        if (this.config.hostname.some( (host) => { return id.startsWith(host); } )) {
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
              type: this.config.type,
              unicast: false,
              wsserver: false,
              battery: this.config.battery,
              sdk: 3,
              gen: this.config.gen,
              communication: this.config.communication,
              fw_version: fw_version
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
      if (deviceArray.store.communication === 'websocket') {
        deviceArray.settings.username = 'admin';
        deviceArray.settings.password = data.password;
      } else {
        deviceArray.settings.username = data.username;
        deviceArray.settings.password = data.password;
      }
      return Promise.resolve(true);
    });

    session.setHandler('add_device', async (data) => {
      try {
        if (deviceArray.store.communication === 'coap') {
          const unicast = await this.util.setUnicast(deviceArray.settings.address, deviceArray.settings.username, deviceArray.settings.password);
          deviceArray.store.unicast = true;
          return Promise.resolve({device: deviceArray, config: this.config});
        } else if (deviceArray.store.communication === 'websocket' && (semver.gt(deviceArray.store.fw_version, '0.11.0') || deviceArray.store.battery === true)) { // TODO: make this match the new firmware version that supports outbound websockets
          const wsserver = await this.util.setWsServer(deviceArray.settings.address, deviceArray.settings.username, deviceArray.settings.password);
          deviceArray.store.wsserver = true;
          return Promise.resolve({device: deviceArray, config: this.config});
        } else {
          return Promise.resolve({device: deviceArray, config: this.config});
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
