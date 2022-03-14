'use strict';

const Homey = require('homey');
const Device = require('./device.js');
const Util = require('../lib/util.js');
const WebSocket = require('ws');
const tinycolor = require("tinycolor2");

class ShellyDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});
  }

  async onDeleted() {
    try {
      clearInterval(this.pollingInterval);
      if (this.getStoreValue('communication') === 'websocket') {
        clearTimeout(this.pingWsTimeout);
        if (this.getStoreValue('channel') === 0 && this.ws.readyState !== WebSocket.CLOSED) {
          this.ws.close();
        }
        clearTimeout(this.reconnectWsTimeout);
      }
      if (this.getStoreValue('communication') === 'coap') {
        await this.util.sendCommand('/settings?coiot_enable=false', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await this.util.sendCommand('/reboot', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
      if (this.getStoreValue('channel') === 0 || this.getStoreValue('channel') == null) {
        const iconpath = "/userdata/" + this.getData().id +".svg";
        await this.util.removeIcon(iconpath);
      }
      await this.homey.app.updateShellyCollection();
      return;
    } catch (error) {
      this.error(error);
    }
  }

  // HELPER FUNCTIONS

  /* websocket for gen2 devices */
  async connectWebsocket() {

    this.ws = new WebSocket('ws://'+ this.getSetting("address") +'/rpc', {perMessageDeflate: false});

    this.ws.on('open', () => {
      this.connected = true;
      this.ws.send(JSON.stringify({"id": 0, "src": this.getData().id, "method": "Shelly.GetStatus"}));
      this.log('Websocket for gen2 LAN device opened:', this.getData().id);
    });

    this.ws.on('message', (data) => {
      try {
        const result = JSON.parse(data);

        if (result.hasOwnProperty("method")) {
          if (result.method === 'NotifyStatus') { /* parse capability status updates */
            const components_list = Object.entries(result.params);
            const components = components_list.map(([component, options]) => { return { component, ...options }; });

            components.forEach((element) => {
              var component = element.component;
              var channel = element.id

              for (const [capability, value] of Object.entries(element)) {
                if (capability === 'errors') { /* handle device errors */
                  value.forEach((element) => {
                    const device_id = this.getStoreValue('main_device') + '-channel-' + channel;
                    const device = this.driver.getDevice({id: device_id });
                    this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": device.getName(), "device_error": this.homey.__(element)});
                  });
                } else if (capability !== 'component' && capability !== 'id' && capability !== 'source') {

                  if (typeof value === 'object' && value !== null) { /* parse aenergy and device temperature data */
                    for (const [capability, values] of Object.entries(value)) {
                      if (capability !== 'by_minute' && capability !== 'minute_ts' && capability !== 'tF') {
                        this.parseCapabilityUpdate(capability, values, channel);
                      }
                    }
                  } else if (component.startsWith('input')) { /* parse input data */
                    let input = component.replace(":", "");
                    this.parseCapabilityUpdate(input, value, channel);
                  } else {
                    this.parseCapabilityUpdate(capability, value, channel);
                  }
                }
              }
            });
          } else if (result.method === 'NotifyEvent') { /* parse event updates */
            result.params.events.forEach((event) => {
              let device;
              let action_event;
              let channel = event.id;

              // get the right device
              if (channel === 0 || this.hasCapability('input_2')) { // if channel is 0 or device is not a multichannel device in Homey we have the right device
                device = this;
              } else { // get the right device based on the channel
                const device_id = this.getStoreValue('main_device') + '-channel-' + channel;
                device = this.driver.getDevice({id: device_id });
              }

              // get the right action
              if (channel === 0 && !device.hasCapability('input_2')) {
                action_event = this.util.getActionEventDescription(event.event, this.getStoreValue('communication'), this.getStoreValue('gen'));
              } else {
                const event_channel = channel + 1;
                action_event = this.util.getActionEventDescription(event.event, this.getStoreValue('communication'), this.getStoreValue('gen')) + '_' + event_channel;
              }

              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": device.getData().id, "device": device.getName(), "action": action_event}, {"id": device.getData().id, "device": device.getName(), "action": action_event});
            });
          }
        }
      } catch (error) {
        this.error(error);
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
      this.ws.close();
    });

    this.ws.on('close', () => {
      clearTimeout(this.reconnectWsTimeout);
      this.connected = false;
      this.reconnectWsTimeout = this.homey.setTimeout(() => {
        this.connectWebsocket();
      }, 30 * 1000);
    });
  }

}

module.exports = ShellyDevice;
