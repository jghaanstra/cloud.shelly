'use strict';

const Homey = require('homey');
const Device = require('./device.js');
const Util = require('../lib/util.js');
const WebSocket = require('ws');

class ShellyDevice extends Device {

  /* onDeleted() */
  async onDeleted() {
    try {
      this.homey.clearInterval(this.pollingInterval);

      /* disable CoAP for gen1 devices */
      if (this.getStoreValue('communication') === 'coap' && this.getStoreValue('channel') === 0) {
        await this.util.sendCommand('/settings?coiot_enable=false', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await this.util.sendCommand('/reboot', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }

      // TODO: eventually remove this once the firmware for outbound websockets has been rolled out
      /* disconnect to device websocket server for gen2 devices */
      if (this.getStoreValue('communication') === 'websocket' && this.getStoreValue('channel') === 0 && !this.getStoreValue('wsserver') && this.ws !== undefined && this.ws !== null) {
        if (this.ws.readyState !== WebSocket.CLOSED) {
          this.ws.close();
        }
      }
      if (this.getStoreValue('communication') === 'websocket') {
        this.homey.setTimeout(() => {
          this.homey.clearTimeout(this.pingWsTimeout);
          this.homey.clearTimeout(this.reconnectWsTimeout);
        }, 1000);
      }

      /* disable inboud websockets for gen2 devices */
      if (this.getStoreValue('communication') === 'websocket' && this.getStoreValue('channel') === 0 && this.getStoreValue('wsserver')) {
        const payload = '{"id":0, "method":"ws.setconfig", "params":{"config":{"ssl_ca":"*", "server":"", "enable":false}}}';
        const settings = await this.util.sendRPCCommand('/rpc', this.getSetting('address'), this.getSetting('password'), 'POST', payload);
        const reboot = await this.util.sendRPCCommand('/rpc/Shelly.Reboot', this.getSetting('address'), this.getSetting('password'));
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

      if (this.getStoreValue('communication') === 'websocket') {
        this.homey.clearTimeout(this.pingWsTimeout);
        this.homey.clearTimeout(this.reconnectWsTimeout);
      }

      return await this.homey.app.updateShellyCollection();
    } catch (error) {
      this.error(error);
    }
  }

  // HELPER FUNCTIONS

  /* websocket for gen2 devices */
  async connectWebsocket() {
    try {
      this.ws = new WebSocket('ws://'+ this.getSetting("address") +'/rpc', {perMessageDeflate: false});

      this.ws.on('open', () => {
        this.connected = true;
        this.ws.send(JSON.stringify({"id": 0, "src": this.getData().id, "method": "Shelly.GetStatus"}));
        this.log('Websocket for gen2 LAN device opened:', this.getData().id);
      });
  
      this.ws.on('message', (data) => {
        try {
          if (!this.getAvailable()) { this.setAvailable(); }

          const result = JSON.parse(data);

          if (result.hasOwnProperty("error")) {
            if (result.error.hasOwnProperty("code")) {
              if (result.error.code === 401) {
                if (this.digestRetries == undefined) {
                  this.digestRetries = 0;
                }
                if (this.digestRetries < 2) {
                  this.digestRetries++;
                  let error_message = JSON.parse(result.error.message);
                  let ha1 = this.util.createHash(this.getSetting('username') +":" + error_message.realm + ":" + this.getSetting('password'));
                  let ha2 = "6370ec69915103833b5222b368555393393f098bfbfbb59f47e0590af135f062"; // createHash("dummy_method:dummy_uri");
                  let cnonce = String(Math.floor(Math.random() * 10e8));
                  let digest = ha1 +":"+ error_message.nonce +":"+ error_message.nc +":"+ cnonce +":auth:"+ ha2;
                  let response = this.util.createHash(digest);
                  let auth = JSON.parse('{"realm":"'+ error_message.realm +'", "username":"admin", "nonce":'+ error_message.nonce +', "cnonce":'+ cnonce +', "response":"'+ response +'", "algorithm":"SHA-256"}');
                  this.setStoreValue('digest_auth_websocket', auth);
                }
              }
            }
          } else {
            this.digestRetries = 0;
          }

          this.parseSingleStatusUpdateGen2(result);
        } catch (error) {
          this.log(error);
        }
      });
  
      this.ws.on('ping', () => {
        clearTimeout(this.pingWsTimeout);
        this.pingWsTimeout = this.homey.setTimeout(() => {
          if (this.ws === null || this.ws.readyState === WebSocket.CLOSED) {
            this.connected = false;
            this.connectWebsocket();
          } else {
            this.ws.close();
          }
        }, 120 * 1000);
      });
  
      this.ws.on('error', (error) => {
        this.error(error);
      });
  
      this.ws.on('close', () => {
        clearTimeout(this.reconnectWsTimeout);
        this.connected = false;
        this.reconnectWsTimeout = this.homey.setTimeout(() => {
          this.connectWebsocket();
        }, 30 * 1000);
      });
    } catch (error) {
      this.error(error);
    }
  }

}

module.exports = ShellyDevice;