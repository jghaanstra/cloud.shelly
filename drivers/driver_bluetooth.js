'use strict';

const Homey = require('homey');
const Util = require('../lib/util.js');

class ShellyBluetoothDriver extends Homey.Driver {

  async onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});
  }

  async onPairListDevices() {
    try {
      let advertisements = {};
      const discovery_result = await this.homey.ble.discover().catch(this.error);

      discovery_result.forEach(advertisement => {
        if (!advertisements[advertisement.address] && this.util.filterBLEDevices(advertisement.localName)) {
          let device_config = this.util.getDeviceConfig('type', advertisement.localName);
          advertisements[advertisement.address] = {};
          advertisements[advertisement.address].name = device_config.name + ' ['+ advertisement.address + ']';
          advertisements[advertisement.address].device_config = device_config;
          advertisements[advertisement.address].type = advertisement.localName;
        }
      });

      await this.util.sleep(5000);

      return Object.entries(advertisements).map(([address, advertisement]) => ({
        name: advertisement.name,
        class: advertisement.device_config.class,
        data: {
          id: address,
        },
        capabilities: advertisement.device_config.capabilities_1,
        capabilitiesOptions: advertisement.device_config.capability_options,
        settings: advertisement.device_config.settings,
        energy: advertisement.device_config.energy,
        store: {
          config: advertisement.device_config,
          main_device: address,
          channel: 0,
          type: advertisement.type,
          unicast: false,
          wsserver: false,
          battery: advertisement.device_config.battery,
          sdk: 3,
          gen: advertisement.device_config.gen,
          communication: advertisement.device_config.communication
        },
        icon: advertisement.device_config.icon
      }));
    } catch (error) {
      this.error(error);
      return Promise.reject(error);
    }
  }

}

module.exports = ShellyBluetoothDriver;