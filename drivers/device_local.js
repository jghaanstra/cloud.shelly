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

  async onAdded() {
    if (this.getStoreValue('channel') === 0 || this.getStoreValue('channel') == null) {
      setTimeout(async () => {
        return await this.homey.app.updateShellyCollection();
      }, 2000);
    }
  }

  async onDeleted() {
    try {
      clearInterval(this.pollingInterval);
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
          this.parseCapabilityUpdate('switch'+channel, result["switch:"+channel].output, channel);
        }

        /* measure_power */
        if (result["switch:"+channel].hasOwnProperty("apower") && this.hasCapability('measure_power')) {
          this.parseCapabilityUpdate('power'+channel, result["switch:"+channel].apower, channel);
        }

        /* meter_power */
        if (result["switch:"+channel].hasOwnProperty("aenergy") && this.hasCapability('meter_power')) {
          if (result["switch:"+channel].aenergy.hasOwnProperty("total")) {
            this.parseCapabilityUpdate('energyCounter'+channel, result["switch:"+channel].aenergy.total, channel);
          }
        }

        /* measure_voltage */
        if (result["switch:"+channel].hasOwnProperty("voltage")) {
          this.parseCapabilityUpdate('voltage'+channel, result["switch:"+channel].voltage, channel);
        }

        /* inputs */
        if (result["switch:"+channel].hasOwnProperty("input") && this.hasCapability('input_1')) {
          this.parseCapabilityUpdate('input'+channel, result["switch:"+channel].input, channel);
        }

        /* measure_temperature (device temperature) */
        if (result["switch:"+channel].hasOwnProperty("temperature") && this.hasCapability('measure_temperature')) {
          this.parseCapabilityUpdate('deviceTemperature', result["switch:"+channel].temperature.tC, 0);
        }

      }

      // DEVICE TEMPERATURE
      if (result.hasOwnProperty("systemp") && this.hasCapability('measure_temperature') && this.getStoreValue('channel') === 0) {

        /* measure_temperature */
        this.parseCapabilityUpdate('deviceTemperature', result.systemp.tC, 0);
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
      this.ws.send(JSON.stringify({"id": 0, "src": this.getData().id, "method": "Shelly.GetStatus"}));
      this.connected = true;
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

              if (capability !== 'component' && capability !== 'id' && capability !== 'source') {

                /* parse aenergy and device temperature data */
                if (typeof value === 'object' && value !== null) {
                  for (const [capability, values] of Object.entries(value)) {
                    if (capability !== 'by_minute' && capability !== 'minute_ts' && capability !== 'tF') {
                      this.parseCapabilityUpdate(capability, values, channel);
                    }
                  }
                } else {
                  this.parseCapabilityUpdate(capability, value, channel);
                }
              }
            }
          });
        } else if (result.method === 'NotifyEvent') { /* parse event updates */
          result.params.events.forEach((event) => {
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.util.getActionEventDescription(event.event)}, {"id": this.getData().id, "device": this.getName(), "action": this.util.getActionEventDescription(event.event)});
          });
        }
      } catch (error) {
        this.log(error);
      }
    });

    this.ws.on('ping', () => {
      clearTimeout(this.pingWsTimeout);
      this.pingWsTimeout = setTimeout(() => {
        this.ws.close();
      }, 60000);
    });

    this.ws.on('error', (error) => {
      this.log(error);
      this.ws.close();
    });

    this.ws.on('close', () => {
      clearTimeout(this.reconnectWsTimeout);
      this.connected = false;

      this.reconnectWsTimeout = setTimeout(() => {
        this.connectWebsocket();
      }, 60000);
    });
  }

}

module.exports = ShellyDevice;
