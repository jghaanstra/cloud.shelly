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

    const discoveryStrategyX = this.homey.discovery.getStrategy("shellyx");
    const discoveryResultsX = discoveryStrategyX.getDiscoveryResults();

    const discoveryResultsMerged = {...discoveryResults, ...discoveryResultsX};

    session.setHandler('list_devices', async (data) => {
      try {

        /* list subdevices from BLU Gateways Gen 3 as well */
        for (const [key, value] of Object.entries(discoveryResultsMerged)) {
          if (key.toLowerCase().startsWith('shellyblugwg3-')) {
            const data = await this.util.sendCommand('/rpc/Shelly.GetComponents', value.address, '', '');
            if (data.components && Array.isArray(data.components)) {
              data.components.forEach(component => {
                if (component.key && component.key.toLowerCase().startsWith("blutrv")) {
                  component.key = "shelly"+component.key;
                  const newDeviceData = {
                    "id": component.key.split(':')[0] +"-"+ component.status.id +"-"+ value.name,
                    "address": value.address,
                    "host": component.key.split(':')[0] +"-"+ component.status.id +"-"+ value.name,
                    "name": component.key.split(':')[0] +"-"+ component.status.id +"-"+ value.name,
                    "txt": {"gen": "3"}
                  }
                  discoveryResultsMerged[newDeviceData.host] = newDeviceData;
                }
              });
            }
          }
        }

        /* get already paired Shelly devices and remove them from discoveryResults */
        const shellyDevices = await this.util.getShellies('collection');
        for (const shellyDevice of shellyDevices){
          delete discoveryResultsMerged[shellyDevice.main_device];
          delete discoveryResultsMerged[shellyDevice.main_device + '.local'];
        }

        /* fill devices object with discovered devices */
        const devices = Object.values(discoveryResultsMerged).map(discoveryResult => {
          return {
            name: discoveryResult.host + ' ['+ discoveryResult.address +']',
            data: {
              id: discoveryResult.host
            }
          };
        });

        /* return the devices if there are unpaired Shelly devices or else show the manual pairing wizard */
        if (devices.length > 0) {
          return devices;
        } else {
          session.showView('select_pairing');
        }
      } catch (error) {
        this.error(error);
      }
    });

    session.setHandler('list_devices_selection', async (data) => {
      return selectedDeviceId = data[0].data.id;
    });

    session.setHandler('get_device', async (data) => {
      try {
        const discoveryResult = discoveryResultsMerged[selectedDeviceId];

        if (discoveryResult === undefined || discoveryResult === null) {
          this.error('selected device with selectedDeviceId', selectedDeviceId, 'from discoveryResults is not defined, logging discoveryResults object.');
          this.error(JSON.stringify(discoveryResultsMerged));
          throw new Error('Selected device from discoveryResults is undefined, please send a diagnostic report to the developer. Device ID is', selectedDeviceId);
        } else {

          /* get device config based on hostname of the discovered device */
          let device_config;
          let hostname;
          if (discoveryResult.txt.app === 'XMOD1') {
            device_config = this.util.getDeviceConfig('XMOD1', 'type');
          } else {
            hostname = discoveryResult.host.substr(0, discoveryResult.host.indexOf("-") + 1);
            device_config = this.util.getDeviceConfig(hostname, 'hostname');
          }

          if (typeof device_config === 'undefined') {
            this.error('No device config found for device with hostname', hostname);
            throw new Error(this.homey.__('pair.no_device_config') + ' Device has hostname:' + hostname);
          }

          switch(device_config.gen) {
            case 'gen1':
              try {
                var result = await this.util.sendCommand('/shelly', discoveryResult.address, '', '');
                var auth = result.auth;
                var type = result.type;

                /* update device config if it's a roller shutter */
                if (result.hasOwnProperty("num_rollers") && result.hasOwnProperty("mode")) {
                  if (result.mode === 'roller') {
                    device_config = this.util.getDeviceConfig(hostname + 'roller-', 'hostname');
                  }
                } else if (result.hasOwnProperty("num_rollers")) {
                  // fallback for devices with fw < 1.12 but will not work with authentication
                  let settings = await this.util.sendCommand('/settings', discoveryResult.address, '', '');
                  if (settings.mode === 'roller') {
                    device_config = this.util.getDeviceConfig(hostname + 'roller-', 'hostname');
                  }
                }

                /* update device config if it's a RGBW2 in white mode */
                if (device_config.name === 'Shelly RGBW2 Color') {
                  if (result.num_outputs === 4) {
                    device_config = this.util.getDeviceConfig(hostname + 'white-', 'hostname');
                  }
                }

                break;
              } catch (error) {
                throw new Error(this.homey.__("pair.error") + ' Error message: '+ error.message);
              }
            case 'gen2':
            case 'gen3':
              try {
                var result = await this.util.sendCommand('/rpc/Shelly.GetDeviceInfo', discoveryResult.address, '', '');
                var auth = result.auth_en;
                var type = result.model;

                /* update device config if it has a specific profile */
                if (result.hasOwnProperty("profile")) {
                  if (result.profile === "cover") {
                    device_config = this.util.getDeviceConfig(hostname + 'roller-', 'hostname');
                  } else {
                    device_config = this.util.getDeviceConfig(hostname + result.profile +'-', 'hostname');
                  }

                  if (typeof device_config === 'undefined') {
                    this.error('No device config found for device with hostname', hostname + result.profile +'-');
                    throw new Error(this.homey.__('pair.no_device_config') + ' Device has hostname:' + hostname + result.profile +'-');
                  }

                }

                /* update device config if it's a WallDisplay in thermostat mode */
                if (result.hasOwnProperty("relay_in_thermostat")) {
                  if (result.relay_in_thermostat) {
                    device_config = this.util.getDeviceConfig(hostname + 'thermostat-', 'hostname');
                  }
                }
                
                break;
              } catch (error) {
                throw new Error(this.homey.__("pair.error") + ' Error message: '+ error.message);
              }
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

          /* add certain device specific data */
          if (deviceArray.data.id.startsWith('shellyblutrv')) {
            deviceArray.store.componentid = deviceArray.data.id.split("-")[1];
          }

          if (auth) {
            session.showView('login_credentials');
          } else {
            session.showView('icon_select');
          }
        }
      } catch (error) {
        this.error(error);
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
          case 'gen3':
            var result = await this.util.sendCommand('/rpc/Shelly.GetDeviceInfo', data.address, '', '');
            var id = result.id;
            var type = result.model;
            break;
        }

        /* get device config based on hostname / id */
        const hostname = id.substr(0, id.indexOf("-") + 1);
        let device_config = this.util.getDeviceConfig(hostname, 'hostname');

        if (typeof device_config === 'undefined') {
          this.log('No device config found for device with hostname', hostname);
          throw new Error(this.homey.__('pair.no_device_config'));
        }

        switch(device_config.gen) {
          case 'gen1':
            try {

              /* update device config if it's a roller shutter */
              if (result.hasOwnProperty("num_rollers") && result.hasOwnProperty("mode")) {
                if (result.mode === 'roller') {
                  device_config = this.util.getDeviceConfig(hostname + 'roller-', 'hostname');
                }
              }

              /* update device config if it's a RGBW2 in white mode */
              if (device_config.name === 'Shelly RGBW2 Color') {
                if (result.mode === 'white') {
                  device_config = this.util.getDeviceConfig(hostname + 'white-', 'hostname');
                }
              }

              break;
            } catch (error) {
              throw new Error(this.homey.__("pair.error") + ' Error message: '+ error.message);
            }
          case 'gen2':
          case 'gen3':
            try {

              /* update device config if it has a specific profile */
              if (result.hasOwnProperty("profile")) {
                if (result.profile === "cover") {
                  device_config = this.util.getDeviceConfig(hostname + 'roller-', 'hostname');
                } else {
                  device_config = this.util.getDeviceConfig(hostname + result.profile +'-', 'hostname');
                }

                if (typeof device_config === 'undefined') {
                  this.error('No device config found for device with hostname', hostname + result.profile +'-');
                  throw new Error(this.homey.__('pair.no_device_config') + ' Device has hostname:' + hostname + result.profile +'-');
                }

              }

              /* update device config if it's a WallDisplay in thermostat mode */
              if (result.hasOwnProperty("relay_in_thermostat")) {
                if (result.relay_in_thermostat) {
                  device_config = this.util.getDeviceConfig(hostname + 'thermostat-', 'hostname');
                }
              }
              
              break;
            } catch (error) {
              throw new Error(this.homey.__("pair.error") + ' Error message: '+ error.message);
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

        /* add certain device specific data */
        if (deviceArray.data.id.startsWith('shellyblutrv')) {
          deviceArray.store.componentid = deviceArray.data.id.split("-")[1];
        }

        return Promise.resolve(deviceArray);

      } catch (error) {
        this.error(error);
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
          if (settings.name !== null && settings.name !== undefined) { deviceArray.name = settings.name; }
          await this.util.setUnicast(deviceArray.settings.address, deviceArray.settings.username, deviceArray.settings.password);
          deviceArray.store.unicast = true;
          return Promise.resolve(deviceArray);
        } else if (deviceArray.store.communication === 'websocket') {
          const settings = await this.util.sendRPCCommand('/rpc/Shelly.GetConfig', deviceArray.settings.address, deviceArray.settings.password);
          if (settings.sys.device.name !== null && settings.sys.device.name !== undefined) { deviceArray.name = settings.sys.device.name; }
          await this.util.setWsServer(deviceArray.settings.address, deviceArray.settings.password);
          deviceArray.store.wsserver = true;

          /* update variable capabilities for Shelly X MOD 1 */
          if (deviceArray.store.config.id === 'xmod1') {
            const extendedCapabilities = await this.util.extendCapabilities(settings, deviceArray.store.config.capabilities_1, deviceArray.store.config.capabilities_2);
            deviceArray.store.config.channels = extendedCapabilities.channels;
            deviceArray.capabilities = extendedCapabilities.capabilities_1;
            deviceArray.store.config.capabilities_1 = extendedCapabilities.capabilities_1;
            deviceArray.store.config.capabilities_2 = extendedCapabilities.capabilities_2;
          }
          
          return Promise.resolve(deviceArray);
        } else if (deviceArray.store.communication === 'gateway') {

          /* retrieve the name of the component */
          const settings = await this.util.sendRPCCommand('/rpc/'+ deviceArray.store.config.extra.component +'.GetConfig?id='+ deviceArray.store.componentid, deviceArray.settings.address, deviceArray.settings.password);
          if (settings.name !== null && settings.name !== undefined) { deviceArray.name = settings.name; }

          /* set the outbound webserver on the gateway */
          await this.util.setWsServer(deviceArray.settings.address, deviceArray.settings.password);
          deviceArray.store.wsserver = true;

          return Promise.resolve(deviceArray);
        } else {
          return Promise.resolve(deviceArray);
        }
      } catch (error) {
        this.error(error);
        return Promise.reject(error);
      }
    });

    session.setHandler('save_icon', async (data) => {
      try {
        const result = await this.util.uploadIcon(data, selectedDeviceId);
        deviceArray.icon = "../../../userdata/"+ selectedDeviceId +".svg";
        return Promise.resolve(true);
      } catch (error) {
        this.error(error);
      }
    });

  }

}

module.exports = ShellyDriver;