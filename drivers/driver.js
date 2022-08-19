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
      try {

        /* get already paired Shelly devices */
        const shellyDevices = await this.util.getShellies('collection');
        let unpairedShellies = 0;

        /* fill devices object with discovered devices */
        const devices = Object.values(discoveryResults).map(discoveryResult => {
          let needsPairing = false;

          /* match discovery result with already paired Shellies to determine if there are unpaired devices */
          if (shellyDevices.length === 0) { // no paired shellies
            unpairedShellies++
            needsPairing = true;
          } else if (shellyDevices.length > 0) {
            const pairedShelly = shellyDevices.filter(shelly => shelly.id.includes(discoveryResult.host));
            if (pairedShelly.length === 0) { // paired shellies available but this ID has not been paired yet
              unpairedShellies++
              needsPairing = true;
            }
          }

          
          if (needsPairing) {
            return {
              name: discoveryResult.host + ' ['+ discoveryResult.address +']',
              data: {
                id: discoveryResult.host
              }
            };
          } else { // do not return already paired devices
            return {};
          }          

        });

        /* return the devices if there are unpaired Shelly devices or else show the manual pairing wizard */
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

        /* get device config based on hostname of the discovered device */
        const hostname = discoveryResult.host.substr(0, discoveryResult.host.lastIndexOf("-") + 1);
        let device_config = this.util.getDeviceConfig(hostname);

        if (typeof device_config === 'undefined') {
          this.log('No device config found for device with hostname', hostname);
          throw new Error(this.homey.__('pair.no_device_config') + ' Device has hostname:' + hostname);
        }

        switch(device_config.gen) {
          case 'gen1':
            var result = await this.util.sendCommand('/shelly', discoveryResult.address, '', '');
            var auth = result.auth;
            var type = result.type;

            /* update device config if it's a roller shutter */
            if (result.hasOwnProperty("num_rollers") && result.hasOwnProperty("mode")) {
              if (result.mode === 'roller') {
                device_config = this.util.getDeviceConfig(hostname + 'roller-');
              }
            } else if (result.hasOwnProperty("num_rollers")) {
              // fallback for devices with fw < 1.12 but will not work with authentication
              let settings = await this.util.sendCommand('/settings', discoveryResult.address, '', '');
              if (settings.mode === 'roller') {
                device_config = this.util.getDeviceConfig(hostname + 'roller-');
              }
            }

            /* update device config if it's a RGBW2 in white mode */
            if (device_config.name === 'Shelly RGBW2 Color') {
              if (result.num_outputs === 4) {
                device_config = this.util.getDeviceConfig(hostname + 'white-');
              }
            }

            break;
          case 'gen2':
            var result = await this.util.sendCommand('/rpc/Shelly.GetDeviceInfo', discoveryResult.address, '', '');
            var auth = result.auth_en;
            var type = result.model;

            /* update device config if it's a roller shutter */
            if (result.hasOwnProperty("profile")) {
              if (result.profile === "cover") {
                device_config = this.util.getDeviceConfig(hostname + 'roller-');
              }
            }
            break;
        }

        deviceArray = {
          name: device_config.name + ' ['+ discoveryResult.address +']',
          class: device_config.class,
          data: {
            id: discoveryResult.host,
          },
          settings: {
            address  : discoveryResult.address,
            username : '',
            password : ''
          },
          capabilities: device_config.capabilities_1,
          capabilitiesOptions: device_config.capability_options,
          energy: device_config.energy,
          store: {
            config: device_config,
            main_device: discoveryResult.host,
            channel: 0,
            type: type,
            unicast: false,
            wsserver: false,
            battery: device_config.battery,
            sdk: 3,
            gen: device_config.gen,
            communication: device_config.communication
          },
          icon: device_config.icon
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
        switch(data.gen) {
          case 'gen1':
            var result = await this.util.sendCommand('/settings', data.address, data.username, data.password);
            var id = result.device.hostname;
            var type = result.device.type;
            break;
          case 'gen2':
            var result = await this.util.sendCommand('/rpc/Shelly.GetDeviceInfo', data.address, '', '');
            var id = result.id;
            var type = result.model;
            break;
        }

        /* get device config based on hostname / id */
        const hostname = id.substr(0, id.lastIndexOf("-") + 1);
        let device_config = this.util.getDeviceConfig(hostname);

        if (typeof device_config === 'undefined') {
          this.log('No device config found for device with hostname', hostname);
          throw new Error(this.homey.__('pair.no_device_config'));
        }

        /* update gen1 device config if it's a roller shutter */
        if (data.gen === 'gen1' && result.hasOwnProperty("mode")) {
          if (result.mode === "roller") {
            device_config = this.util.getDeviceConfig(hostname + 'roller-');
          }
        }

        /* update gen2 device config if it's a roller shutter */
        if (data.gen === 'gen2' && result.hasOwnProperty("profile")) {
          if (result.profile === "cover") {
            device_config = this.util.getDeviceConfig(hostname + 'roller-');
          }
        }

        /* update device config if it's a RGBW2 in white mode */
        if (device_config.name === 'Shelly RGBW2 Color') {
          if (result.mode === 'white') {
            device_config = this.util.getDeviceConfig(hostname + 'white-');
          }
        }

        deviceArray = {
          name: device_config.name+ ' ['+ data.address +']',
          class: device_config.class,
          data: {
            id: id,
          },
          settings: {
            address  : data.address,
            username : data.username,
            password : data.password
          },
          capabilities: device_config.capabilities_1,
          capabilitiesOptions: device_config.capability_options,
          energy: device_config.energy,
          store: {
            config: device_config,
            main_device: id,
            channel: 0,
            type: type,
            unicast: false,
            wsserver: false,
            battery: device_config.battery,
            sdk: 3,
            gen: device_config.gen,
            communication: device_config.communication
          },
          icon: device_config.icon
        }
        return Promise.resolve(deviceArray);

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
          const settings = await this.util.sendCommand('/settings', deviceArray.settings.address, deviceArray.settings.username, deviceArray.settings.password);
          if (settings.name !== null) {
            deviceArray.name = settings.name;
          }
          const unicast = await this.util.setUnicast(deviceArray.settings.address, deviceArray.settings.username, deviceArray.settings.password);
          deviceArray.store.unicast = true;
          return Promise.resolve(deviceArray);
        } else if (deviceArray.store.communication === 'websocket') {
          const settings = await this.util.sendRPCCommand('/rpc/Shelly.GetConfig', deviceArray.settings.address, deviceArray.settings.password);
          if (settings.sys.device.name !== null) {
            deviceArray.name = settings.sys.device.name;
          }
          const result = await this.util.setWsServer(deviceArray.settings.address, deviceArray.settings.password);
          if (result === 'OK') {
            deviceArray.store.wsserver = true;
          }
          return Promise.resolve(deviceArray);
        } else {
          return Promise.resolve(deviceArray);
        }
      } catch (error) {
        return Promise.reject(error);
      }
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