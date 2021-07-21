'use strict';

const Homey = require('homey');
const Util = require('../lib/util.js');


class ShellyCloudDriver extends Homey.Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});
  }

  onPair(session) {
    let deviceArray = {};

    session.setHandler('test_cloud_connection', async (data) => {
      try {
        const result = await this.util.sendCloudCommand('/device/settings', data.server_address, data.cloud_token, data.device_id);
        const hostname = result.data.device_settings.device.hostname
        if (hostname.startsWith(this.config.hostname)) {
          deviceArray = {
            name: this.config.name,
            data: {
              id: hostname,
            },
            settings: {
              server_address: data.server_address,
              cloud_token: data.cloud_token,
              device_id: data.device_id
            },
            store: {
              main_device: hostname,
              channel: 0,
              type: result.data.device_settings.device.type,
              unicast: false,
              battery: this.config.battery,
              sdk: 3,
              communication: 'cloud'
            }
          }
          return Promise.resolve(result);
        } else {
          return Promise.reject(this.homey.__('driver.wrongdevice'));
        }
      } catch (error) {
        return Promise.reject(error);
      }
    });

    session.setHandler('get_cloud_login', async (data) => {
      try {
        const result = await this.util.getCloudLogin();
        return Promise.resolve(result);
      } catch (error) {
        return Promise.reject(error);
      }
    });


    session.setHandler('add_device', async (data) => {
      try {
        return Promise.resolve(deviceArray);
      } catch (error) {
        return Promise.reject(error);
      }
    });
  }

}

module.exports = ShellyCloudDriver;
