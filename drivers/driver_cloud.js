'use strict';

const Homey = require('homey');
const { OAuth2Driver } = require('homey-oauth2app');
const jwt_decode = require('jwt-decode');
let selectedDevice = {};

class ShellyCloudDriver extends OAuth2Driver {

  async onPair(socket) {
    await super.onPair(socket);

    socket.setHandler('list_devices_selection', async (data) => {
      return selectedDevice = data[0];
    });

    socket.setHandler('multi_channel_cloud', async () => {
      try {
        return Promise.resolve({device: selectedDevice, config: this.config});
      } catch (error) {
        return Promise.reject(error);
      }
    });
  }

  async onPairListDevices({ oAuth2Client }) {
    try {
      const oauth_token = await oAuth2Client.getToken();
      const cloud_details = await jwt_decode(oauth_token.access_token);
      const cloud_server = cloud_details.user_api_url.replace('https://', '');
      const devices_data = await oAuth2Client.getCloudDevices(cloud_server);
      var devices = [];
      Object.entries(devices_data.data.devices_status).forEach(([key, value]) => {
        if (value.hasOwnProperty('_dev_info')) { // make sure _dev_info is present
          if (value._dev_info.online) { // we only want to pair online devices to avoid users complaining about unreachable devices
            var device_code = value._dev_info.code; // get the device code
            if (value._dev_info.gen === "G1") { // get the IP address to allow device identification in the pairing wizard, property location depends on device generation
              var device_ip = value.wifi_sta.ip;
            } else if (value._dev_info.gen === "G2") {
              var device_ip = value.wifi.sta_ip;
            }
            if (this.config.type.some((host) => { return device_code.startsWith(host) })) { // filter only device for the chosen driver
              devices.push({
                name: this.config.name+ ' ['+ device_ip +']',
                data: {
                  id: String(key),
                },
                settings: {
                  cloud_server: cloud_server,
                  cloud_device_id: parseInt(String(key),16)
                },
                store: {
                  main_device: String(key),
                  channel: 0,
                  type: device_code,
                  battery: this.config.battery,
                  sdk: 3,
                  gen: this.config.gen,
                  communication: 'cloud'
                }
              });
            }
          }
        }
      });
      return devices;
    } catch (error) {
      this.error(error);
      return Promise.reject(error);
    }
  }

}

module.exports = ShellyCloudDriver;
