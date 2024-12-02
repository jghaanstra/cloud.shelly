'use strict';

const Homey = require('homey');
const { OAuth2Driver } = require('homey-oauth2app');
const { jwtDecode } = require('jwt-decode');
const Util = require('../lib/util.js');
let selectedDevice = {};

class ShellyCloudDriver extends OAuth2Driver {

  async onPair(socket) {
    if (!this.util) this.util = new Util({homey: this.homey});
    
    await super.onPair(socket);

    socket.setHandler('list_devices_selection', async (data) => {
      return selectedDevice = data[0];
    });

    socket.setHandler('add_device_cloud', async () => {
      try {
        return Promise.resolve(selectedDevice);
      } catch (error) {
        return Promise.reject(error);
      }
    });
  }

  async onPairListDevices({ oAuth2Client }) {
    try {
      const oauth_token = await oAuth2Client.getToken();
      const cloud_details = await jwtDecode(oauth_token.access_token);
      const cloud_server = cloud_details.user_api_url.replace('https://', '');
      if (cloud_server === null) throw "No valid cloud server address found, please try again.";
      const devices_data = await oAuth2Client.getCloudDevices(cloud_server);
      var devices = [];
      Object.entries(devices_data.data.devices_status).forEach(async ([key, value]) => {
        if (value.hasOwnProperty('_dev_info')) { // make sure _dev_info is present
          if (value._dev_info.online) { // we only want to pair online devices to avoid users complaining about unreachable devices
            var device_code = value._dev_info.code; // get the device code
            if (value._dev_info.gen === "G1") { // get the IP address to allow device identification in the pairing wizard, it's location depends on device generation
              var device_ip = value.wifi_sta.ip || "";
              var cloud_device_id = parseInt(String(key),16);
            } else if (value._dev_info.gen === "G2") {
              var device_ip = value.wifi.sta_ip || "";
              var cloud_device_id = parseInt(String(key),16);
            } else if (value._dev_info.gen === "GBLE") {
              var device_ip = value._dev_info.id;
              var cloud_device_id = value._dev_info.id;
            }

            /* get device config based on device type of the discovered devices */
            let device_config = this.util.getDeviceConfig(device_code, 'type');

            if (typeof device_config === 'undefined') {
              this.error('No device config found for device with device code', device_code);
              throw new Error(this.homey.__('pair.no_device_config') + ' Device has device code:' + device_code);
            }

            /* update device config if it's a gen1 roller shutter */
            if (value._dev_info.gen === "G1" && (device_code === 'SHSW-21' || device_code === 'SHSW-25')) {
              if (value.hasOwnProperty("rollers")) {
                device_config = this.util.getDeviceConfig(device_config.hostname[0] + 'roller-', 'hostname');
              }
            }

            /* update device config if it's a gen1 RGBW2 in white mode */
            if (value._dev_info.gen === "G1" && device_code === 'SHRGBW2') {
              if (value.mode === 'white') {
                device_config = this.util.getDeviceConfig(device_config.hostname[0] + 'white-', 'hostname');
              }
            }

            /* update device config if it's a gen2 roller shutter */
            if (value._dev_info.gen === "G2" && value.hasOwnProperty("cover:0")) {
              device_config = this.util.getDeviceConfig(device_config.hostname[0] + 'roller-', 'hostname');
            }

            device_config.communication = 'cloud';

            if (typeof device_config === 'undefined') {
              this.error('No device config found for device with device code', device_code);
              throw new Error(this.homey.__('pair.no_device_config') + ' Device has device code:' + device_code);
            }
    
            devices.push({
              name: device_config.name+ ' ['+ device_ip +']',
              class: device_config.class,
              data: {
                id: String(key),
              },
              settings: {
                cloud_server: cloud_server,
                cloud_device_id: cloud_device_id
              },
              capabilities: device_config.capabilities_1,
              capabilitiesOptions: device_config.capability_options,
              energy: device_config.energy,
              store: {
                config: device_config,
                main_device: String(key),
                channel: 0,
                type: device_code,
                battery: device_config.battery,
                sdk: 3,
                gen: device_config.gen,
                communication: 'cloud'
              },
              icon: device_config.icon
            });

          }
        }
      });
      return devices;
    } catch (error) {
      this.error(error);
    }
  }

}

module.exports = ShellyCloudDriver;