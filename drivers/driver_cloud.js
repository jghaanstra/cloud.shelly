'use strict';

const Homey = require('homey');
const Util = require('../lib/util.js');

class ShellyCloudDriver extends Homey.Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});
  }

  onPair(session) {
    let deviceArray = {};

    session.setHandler('test_connection', async (data) => {
      try {
        const device = await this.homey.app.getPairingDevice();
        // TO DO: ADD GEN ATTRIBUTE WHEN IT BECOMES AVAILABLE IN THE INTEGRATOR API
        deviceArray = {
          name: device.name[0],
          data: {
            id: String(device.deviceId),
          },
          settings: {
            server_address: device.host,
            cloud_device_id: device.deviceId
          },
          store: {
            main_device: String(device.deviceId),
            channel: 0,
            type: device.deviceType,
            unicast: false,
            battery: this.config.battery,
            sdk: 3,
            communication: 'cloud'
          }
        }
        return Promise.resolve(device);
      } catch (error) {
        return Promise.reject(error);
      }
    });

    session.setHandler('get_integrator_url', async (data) => {
      try {
        const result = await this.homey.app.getIntegratorUrl();
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
