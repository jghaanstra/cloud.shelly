'use strict';

const Homey = require('homey');
const { OAuth2Driver } = require('homey-oauth2app');
const jwt_decode = require('jwt-decode');

class ShellyCloudDriver extends OAuth2Driver {

  // TODO: use onPair(session) to be able to add custom pairing template for 2 channel devices

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
              var gen = 'gen1';
            } else if (value._dev_info.gen === "G2") {
              var device_ip = value.wifi.sta_ip;
              var gen = 'gen2';
            }
            if (this.config.code.some((host) => { return device_code.startsWith(host) })) { // filter only device for the chosen driver
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
                  gen: gen,
                  communication: 'cloud'
                }
              });
            }
          }
        }
      });
      return devices;
    } catch (error) {
      this.log(error);
      return Promise.reject(error);
    }
  }

}

module.exports = ShellyCloudDriver;
