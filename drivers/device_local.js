'use strict';

const Homey = require('homey');
const Device = require('./device.js');
const Util = require('../lib/util.js');

class ShellyDevice extends Device {

  async onDeleted() {
    try {
      this.homey.clearInterval(this.pollingInterval);

      /* disable CoAP for gen1 devices */
      if (this.getStoreValue('communication') === 'coap' && this.getStoreValue('channel') === 0) {
        await this.util.sendCommand('/settings?coiot_enable=false', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await this.util.sendCommand('/reboot', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }

      if (this.getStoreValue('communication') === 'websocket' && this.getStoreValue('channel') === 0) {

        /* disable inboud websockets for gen2 devices */
        if (this.getStoreValue('wsserver')) {
          const payload = '{"id":0, "method":"ws.setconfig", "params":{"config":{"ssl_ca":"*", "server":"", "enable":false}}}';
          await this.util.sendRPCCommand('/rpc', this.getSetting('address'), this.getSetting('password'), 'POST', payload);
        }
        
        /* remove BLE Proxy Script */
        if (this.getStoreValue('ble_script_id') !== null && this.getStoreValue('ble_script_id') !== 0) {
          await this.util.disableBLEProxy(this.getStoreValue('ble_script_id'), this.getSetting('address'), this.getSetting('password'));
        }
        
        await this.util.sendRPCCommand('/rpc/Shelly.Reboot', this.getSetting('address'), this.getSetting('password'));
      }
      
      if (this.getStoreValue('channel') === 0) {
        const iconpath = "/userdata/" + this.getData().id +".svg";
        await this.util.removeIcon(iconpath);
      }

      return await this.homey.app.updateShellyCollection();
    } catch (error) {
      this.error(error);
    }
  }

  async onUninit() {
    try {
      this.homey.clearInterval(this.pollingInterval);

      return await this.homey.app.updateShellyCollection();
    } catch (error) {
      this.error(error);
    }
  }

}

module.exports = ShellyDevice;