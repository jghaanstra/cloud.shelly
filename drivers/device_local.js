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
      this.log(error);
    }
  }

  // HELPER FUNCTIONS

  /* polling websocket devices */
  async pollWebsocketDevice() {
    try {
      let result = await this.util.sendCommand('/rpc/Shelly.GetStatus', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      if (!this.getAvailable()) { this.setAvailable(); }

      let channel = this.getStoreValue('channel') || 0;

      // SWITCH component
      if (result.hasOwnProperty("switch:"+ channel)) {

        /* onoff */
        if (result["switch:"+channel].hasOwnProperty("output") && this.hasCapability('onoff')) {
          this.updateCapabilityValue('onoff', result["switch:"+channel].output, channel);
        }

        /* measure_power */
        if (result["switch:"+channel].hasOwnProperty("apower") && this.hasCapability('measure_power')) {
          this.updateCapabilityValue('measure_power', result["switch:"+channel].apower, channel);
        }

        /* meter_power */
        if (result["switch:"+channel].hasOwnProperty("aenergy") && this.hasCapability('meter_power')) {
          if (result["switch:"+channel].aenergy.hasOwnProperty("total")) {
            let meter_power = result["switch:"+channel].aenergy.total / 1000;
            this.updateCapabilityValue('meter_power', meter_power, channel);
          }
        }

        /* measure_voltage */
        if (result["switch:"+channel].hasOwnProperty("voltage") && this.hasCapability('measure_voltage')) {
          this.updateCapabilityValue('measure_voltage', result["switch:"+channel].voltage, channel);
        }

        /* measure_temperature (device temperature) */
        if (result["switch:"+channel].hasOwnProperty("temperature") && this.hasCapability('measure_temperature')) {
          this.updateCapabilityValue('measure_temperature', result["switch:"+channel].temperature.tC, 0);
        }

      }

      // INPUTS
      if (result.hasOwnProperty("input:"+ channel) && this.hasCapability('input_1')) {
        if (result["input:"+channel].hasOwnProperty("state") && result["input:"+channel].state !== null) {
          this.updateCapabilityValue('input_1', result["input:"+channel].state, channel);
        }
      }

      if (result.hasOwnProperty("input:"+ channel) && this.hasCapability('input_2')) {
        if (result["input:"+channel].hasOwnProperty("state") && result["input:"+channel].state !== null) {
          this.updateCapabilityValue('input_2', result["input:"+channel].state, channel);
        }
      }

      if (result.hasOwnProperty("input:"+ channel) && this.hasCapability('input_3')) {
        if (result["input:"+channel].hasOwnProperty("state") && result["input:"+channel].state !== null) {
          this.updateCapabilityValue('input_3', result["input:"+channel].state, channel);
        }
      }

      if (result.hasOwnProperty("input:"+ channel) && this.hasCapability('input_4')) {
        if (result["input:"+channel].hasOwnProperty("state") && result["input:"+channel].state !== null) {
          this.updateCapabilityValue('input_4', result["input:"+channel].state, channel);
        }
      }

      // DEVICE TEMPERATURE
      if (result.hasOwnProperty("systemp") && this.hasCapability('measure_temperature') && this.getStoreValue('channel') === 0) {

        /* measure_temperature */
        this.updateCapabilityValue('measure_temperature', result.systemp.tC, 0);
      }

      // RSSI
      if (result.hasOwnProperty("wifi")) {

        /* rssi */
        if (result.wifi.hasOwnProperty("rssi") && this.hasCapability("rssi")) {
          this.updateCapabilityValue('rssi', result.wifi.rssi);
        }

      }

      // FIRMWARE UPDATE AVAILABLE
      if (result.sys.available_updates.hasOwnProperty("stable")) {
        this.homey.flow.getTriggerCard('triggerFWUpdate').trigger({"id": this.getData().id, "device": this.getName(), "firmware": result.sys.available_updates.stable.version });
        this.setStoreValue("latest_firmware", result.sys.available_updates.stable.version);
      }

    } catch (error) {
      if (!this.getStoreValue('battery')) {
        this.setUnavailable(this.homey.__('device.unreachable') + error.message);
        this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": this.getName(), "device_error": error.message});
        this.log(error);
      } else {
        this.log(this.getData().id +' is probably asleep and disconnected');
      }
    }
  }

  /* websocket for gen2 devices */
  async connectWebsocket() {
    if (this.getSetting('username') && this.getSetting('password')) {
      var headers = {'Authorization': 'Basic ' + Buffer.from(this.getSetting('username') + ":" + this.getSetting('password')).toString('base64')};
    } else {
      var headers = {};
    }

    this.ws = new WebSocket('ws://'+ this.getSetting("address") +'/rpc', {perMessageDeflate: false, headers: headers});

    this.ws.on('open', () => {
      this.connected = true;
      this.ws.send(JSON.stringify({"id": 0, "src": this.getData().id, "method": "Shelly.GetStatus"}));
      this.log('Websocket for gen2 LAN device opened:', this.getData().id);
    });

    this.ws.on('message', (data) => {
      try {
        const result = JSON.parse(data);
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
            var channel = event.id;
            if (channel === 0) {
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.util.getActionEventDescription(event.event)}, {"id": this.getData().id, "device": this.getName(), "action": this.util.getActionEventDescription(event.event)});
            } else {
              const device_id = this.getStoreValue('main_device') + '-channel-' + channel;
              const device = this.driver.getDevice({id: device_id });
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": device.getData().id, "device": device.getName(), "action": this.util.getActionEventDescription(event.event)}, {"id": device.getData().id, "device": device.getName(), "action": this.util.getActionEventDescription(event.event)});
            }
          });
        }
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
      this.log(error);
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
