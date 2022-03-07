'use strict';

const Homey = require('homey');
const Util = require('../lib/util.js');
const WebSocket = require('ws');
const tinycolor = require("tinycolor2");

class ShellyDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});
  }

  async onAdded() {
    if (this.getStoreValue('channel') === 0 || this.getStoreValue('channel') == null) {
      this.homey.setTimeout(async () => {
        return await this.homey.app.updateShellyCollection();
      }, 2000);
    }
  }

  // CAPABILITY LISTENERS

  /* onoff relay */
  async onCapabilityOnoff(value, opts) {
    try {
      switch(this.getStoreValue('communication')) {
        case 'websocket':{
          if (this.getStoreValue('channel') === 0) {
            return await this.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Switch.Set", "params": {"id": this.getStoreValue('channel'), "on": value} }));
          } else {
            const device_id = this.getStoreValue('main_device') + '-channel-0';
            const device = this.driver.getDevice({id: device_id });
            return await device.ws.send(JSON.stringify({"id": device.getCommandId(), "method": "Switch.Set", "params": {"id": this.getStoreValue('channel'), "on": value} }));
          }
        }
        case 'coap': {
          const path = value ? '/relay/'+ this.getStoreValue("channel") +'?turn=on' : '/relay/'+ this.getStoreValue("channel") +'?turn=off';
          return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        }
        case 'cloud': {
          const onoff = value ? 'on' : 'off';
          return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'relay', command_param: 'turn', command_value: onoff, deviceid: this.getSetting('cloud_device_id'), channel: this.getStoreValue('channel')})]);
        }
        default:
          break;
      }
    } catch (error) {
      this.log(error);
    }
  }

  /* onoff light */
  async onCapabilityOnoffLight(value, opts) {
    try {
      switch(this.getStoreValue('communication')) {
        case 'websocket': {
          break;
        }
        case 'coap': {
          const path = value ? '/light/'+ this.getStoreValue("channel") +'?turn=on' : '/light/'+ this.getStoreValue("channel") +'?turn=off';
          return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        }
        case 'cloud': {
          const onoff = value ? 'on' : 'off';
          return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', command_param: 'turn', command_value: onoff, deviceid: this.getSetting('cloud_device_id'), channel: this.getStoreValue('channel')})]);
        }
        default:
          break;
      }
    } catch (error) {
      this.log(error);
    }
  }

  /* windowcoverings_state */
  async onCapabilityWindowcoveringsState(value, opts) {
    try {
      if (value !== 'idle' && value !== this.getStoreValue('last_action')) {
        this.setStoreValue('last_action', value);
      }
      switch(this.getStoreValue('communication')) {
        case 'websocket': {
          switch (value) {
            case 'idle':
              return await this.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Cover.Stop", "params": {"id": this.getStoreValue('channel')} }));
            case 'up':
              return await this.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Cover.Open", "params": {"id": this.getStoreValue('channel')} }));
            case 'down':
              return await this.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Cover.Close", "params": {"id": this.getStoreValue('channel')} }));
            default:
              return Promise.reject('State not recognized ...');
          }
        }
        case 'coap': {
          switch (value) {
            case 'idle':
              return await this.util.sendCommand('/roller/0?go=stop', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
            case 'up':
              return await this.util.sendCommand('/roller/0?go=open', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
            case 'down':
              return await this.util.sendCommand('/roller/0?go=close', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
            default:
              return Promise.reject('State not recognized ...');
          }
        }
        case 'cloud': {
          switch (value) {
            case 'idle':
              return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'roller', command_param: 'go', command_value: 'stop', deviceid: this.getSetting('cloud_device_id'), channel: this.getStoreValue('channel')})]);
            case 'up':
              return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'roller', command_param: 'go', command_value: 'open', deviceid: this.getSetting('cloud_device_id'), channel: this.getStoreValue('channel')})]);
            case 'down':
              return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'roller', command_param: 'go', command_value: 'close', deviceid: this.getSetting('cloud_device_id'), channel: this.getStoreValue('channel')})]);
            default:
              return Promise.reject('State not recognized ...');
          }
        }
        default:
          break;
      }
    } catch (error) {
      this.log(error);
    }
  }

  /* windowcoverings_set */
  async onCapabilityWindowcoveringsSet(value, opts) {
    try {
      this.setStoreValue('previous_position', this.getCapabilityValue('windowcoverings_set'));
      switch(this.getStoreValue('communication')) {
        case 'websocket': {
          return await this.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Cover.GoToPosition", "params": {"id": this.getStoreValue('channel'), "pos": Math.round(value*100)} }));
        }
        case 'coap': {
          return await this.util.sendCommand('/roller/0?go=to_pos&roller_pos='+ Math.round(value*100), this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        }
        case 'cloud':
          return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'roller_to_pos', command_param: 'pos', command_value: Math.round(value*100), deviceid: this.getSetting('cloud_device_id'), channel: this.getStoreValue('channel')})]);
        default:
          break;
      }
    } catch (error) {
      this.log(error);
    }
  }

  /* dim */
  async onCapabilityDim(value, opts) {
    try {
      if (opts.duration === undefined || typeof opts.duration == 'undefined') {
        opts.duration = 500;
      }
      if (opts.duration > 5000 ) {
        return Promise.reject(this.homey.__('device.maximum_dim_duration'));
      } else {
        switch(this.getStoreValue('communication')) {
          case 'websocket': {
            break
          }
          case 'coap': {
            if (!this.getCapabilityValue('onoff')) {
              const dim_coap = value === 0 ? 1 : value * 100;
              return await this.util.sendCommand('/light/0?turn=on&brightness='+ dim +'&transition='+ opts.duration +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
            } else {
              const dim = value === 0 ? 1 : value * 100;
              return await this.util.sendCommand('/light/0?brightness='+ dim +'&transition='+ opts.duration +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
            }
          }
          case 'cloud': {
            if (!this.getCapabilityValue('onoff')) {
              this.setCapabilityValue('onoff', true);
            }
            const dim = value === 0 ? 1 : value * 100;
            return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', command_param: 'brightness', command_value: dim, deviceid: this.getSetting('cloud_device_id'), channel: this.getStoreValue('channel')})]);
          }
          default:
            break;
        }
      }
    } catch (error) {
      this.log(error);
    }
  }

  /* light_temperature */
  async onCapabilityLightTemperature(value, opts) {
    try {
      switch(this.getStoreValue('communication')) {
        case 'websocket': {
          break
        }
        case 'coap': {
          const white = 100 - (value * 100);
          return await this.util.sendCommand('/light/0?white='+ white +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        }
        case 'cloud': {
          const white = 100 - (value * 100);
          return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', command_param: 'white', command_value: white, deviceid: this.getSetting('cloud_device_id'), channel: this.getStoreValue('channel')})]);
        }
        default:
          break;
      }
    } catch (error) {
      this.log(error);
    }
  }

  /* valve_position */
  async onCapabilityValvePosition(value, opts) {
    try {
      switch(this.getStoreValue('communication')) {
        case 'websocket':{
          break;
        }
        case 'coap': {
          return await this.util.sendCommand('/thermostat/0?pos='+ value, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        }
        case 'cloud':{
          break;
        }
        default:
          break;
      }
    } catch (error) {
      this.log(error);
    }
  }

  /* valve_mode */
  async onCapabilityValveMode(value, opts) {
    try {
      switch(this.getStoreValue('communication')) {
        case 'websocket':{
          break;
        }
        case 'coap': {
          if (value === "0") {
            return await this.util.sendCommand('/thermostat/0?schedule=false', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
          } else {
            return await this.util.sendCommand('/thermostat/0?schedule=true&schedule_profile='+ value, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
          }
        }
        case 'cloud': {
          break;
        }
        default:
          break;
      }
    } catch (error) {
      this.log(error);
    }
  }

  /* target_temperature */
  async onCapabilityTargetTemperature(value, opts) {
    try {
      switch(this.getStoreValue('communication')) {
        case 'websocket':{
          break;
        }
        case 'coap': {
          return await this.util.sendCommand('/thermostat/0?target_t_enabled=true&target_t='+ value, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        }
        case 'cloud':{
          break;
        }
        default:
          break;
      }
    } catch (error) {
      this.log(error);
    }
  }


  // HELPER FUNCTIONS

  /* boot sequence */
  async bootSequence() {
    try {

      // TODO: REMOVE THIS AFTER SOME RELEASES
      if (this.getStoreValue('channel') !== 0 && this.hasCapability('rssi')) {
        this.removeCapability('rssi');
      }

      // TODO: REMOVE THIS AFTER SOME RELEASES
      if (this.getStoreValue('main_device') == null || this.getStoreValue('main_device') == undefined) {
        if (this.getData().id.includes('channel')) {
          const main_device = this.getData().id.slice(-0, -10);
          this.setStoreValue('main_device', main_device)
        } else {
          this.setStoreValue('main_device', this.getData().id);
        }
      }

      if (this.getStoreValue('communication') === 'websocket') {
        if (this.getStoreValue('channel') === 0) {
          this.ws = null;
          this.connected = false;
          this.commandId = 0;
          this.connectWebsocket();
        }
        this.homey.setTimeout(() => {
          this.pollDevice();
        }, this.util.getRandomTimeout(10));
        if ((this.getStoreValue('channel') === 0 || this.getStoreValue('channel') == null) && this.getStoreValue('battery') !== true) {
          this.pollingInterval = this.homey.setInterval(() => {
            this.pollDevice();
          }, 60000);
        } else {
          this.pollingInterval = this.homey.setInterval(() => {
            this.pollDevice();
          }, (60000 + (1000 * this.getStoreValue('channel'))));
        }
      } else {
        if (this.homey.settings.get('general_coap')) { /* CoAP is disabled */
          if (this.getStoreValue('channel') === 0 || this.getStoreValue('channel') == null) {
            this.pollingInterval = this.homey.setInterval(() => {
              this.pollDevice();
            }, this.homey.settings.get('general_polling_frequency') * 1000 || 5000);
          } else {
            this.pollingInterval = this.homey.setInterval(() => {
              this.homey.setTimeout(async () => {
                await this.pollDevice();
              }, this.getStoreValue('channel') * 1500);
            }, this.homey.settings.get('general_polling_frequency') * 1000 || 5000);
          }
        } else { /* CoAP is enabled */
          let channel = this.getStoreValue('channel') || 0;
          this.homey.setTimeout(() => {
            this.pollDevice();
          }, this.util.getRandomTimeout(10));
          this.pollingInterval = this.homey.setInterval(() => {
            this.pollDevice();
          }, (60000 + (1000 * channel)));
        }
      }
    } catch (error) {
      this.log(error);
    }
  }

  /* updating capabilities */
  async updateCapabilityValue(capability, value, channel = 0) {
    try {
      if (channel === 0) {
        if (value != this.getCapabilityValue(capability)) {
          this.setCapabilityValue(capability, value);
        }
      } else {
        const device_id = this.getStoreValue('main_device') + '-channel-' + channel;
        const device = this.driver.getDevice({id: device_id });
        device.updateCapabilityValue(capability, value);
      }
    } catch (error) {
      this.log('Trying to update capability', capability, 'with value', value, 'for device', this.getData().id);
      this.log(error);
    }
  }

  /* polling local GEN1 or GEN2 devices over HTTP REST API */
  async pollDevice() {
    try {
      if (this.getStoreValue('communication') === 'websocket') {
        let result = await this.util.sendCommand('/rpc/Shelly.GetStatus', this.getSetting('address'), this.getSetting('password'));
        if (!this.getAvailable()) { this.setAvailable(); }
        this.parseStatusUpdateGen2(result);
      } else {
        let result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        if (!this.getAvailable()) { this.setAvailable(); }
        this.parseStatusUpdate(result);
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

  /* generic status updates parser for polling over local HTTP REST API and Cloud for GEN1 */
  async parseStatusUpdate(result) {
    try {
      let channel = this.getStoreValue('channel') || 0;

      // RELAYS (onoff)
      if (result.hasOwnProperty("relays") && this.hasCapability('onoff')) {

        if (result.relays.hasOwnProperty([channel])) {
          this.updateCapabilityValue('onoff', result.relays[channel].ison);
        }

      }

      // METERS (measure_power, meter_power)
      if (result.hasOwnProperty("meters")) {

        if (result.meters.hasOwnProperty([channel])) {
          /* measure_power */
          if (result.meters[channel].hasOwnProperty("power") && this.hasCapability('measure_power')) {
            this.updateCapabilityValue('measure_power', result.meters[channel].power);
          }
          /* meter_power */
          if (result.meters[channel].hasOwnProperty("total") && this.hasCapability('meter_power')) {
            let meter_power_meter = result.meters[channel].total * 0.000017;
            this.updateCapabilityValue('meter_power', meter_power_meter);
          }
        }

      }

      // EMETERS (measure_power, meter_power, meter_power_returned, power_factor, measure_current, measure_voltage)
      if (result.hasOwnProperty("emeters")) {

        if (result.emeters.hasOwnProperty([channel])) {

          /* measure_power */
          if (result.emeters[channel].hasOwnProperty("power") && this.hasCapability('measure_power')) {
            this.updateCapabilityValue('measure_power', result.emeters[channel].power);
          }

          /* meter_power */
          if (result.emeters[channel].hasOwnProperty("total") && this.hasCapability('meter_power')) {
            let meter_power_emeter = result.emeters[channel].total / 1000;
            this.updateCapabilityValue('meter_power', meter_power_emeter);
          }

          /* meter_power_returned */
          if (result.emeters[channel].hasOwnProperty("total_returned") && this.hasCapability('meter_power_returned')) {
            let meter_power_returned = result.emeters[channel].total_returned / 1000;
            let meter_power_returned_rounded = Number(meter_power_returned.toFixed(3));
            this.updateCapabilityValue('meter_power_returned', meter_power_returned_rounded);
          }

          /* power factor */
          if (result.emeters[channel].hasOwnProperty("pf") && this.hasCapability('meter_power_factor')) {
            this.updateCapabilityValue('meter_power_returned', result.emeters[channel].pf);
          }

          /* measure_current */
          if (result.emeters[channel].hasOwnProperty("current")  && this.hasCapability('measure_current')) {
            this.updateCapabilityValue('measure_current', result.emeters[channel].current);
          }

          /* measure_voltage */
          if (result.emeters[channel].hasOwnProperty("voltage")  && this.hasCapability('measure_voltage')) {
            this.updateCapabilityValue('measure_voltage', result.emeters[channel].voltage);
          }

        }

      }

      // BAT (measure_battery, measure_voltage)
      if (result.hasOwnProperty("bat")) {

        /* measure_battery */
        if (result.bat.hasOwnProperty("value") && this.hasCapability('measure_battery')) {
          this.updateCapabilityValue('measure_battery', result.bat.value);
        }

        /* measure_voltage */
        if (result.bat.hasOwnProperty("voltage") && this.hasCapability('measure_voltage')) {
          this.updateCapabilityValue('measure_voltage', result.bat.voltage);
        }

      }

      // TMP (measure_temperature)
      if (result.hasOwnProperty("tmp")) {

        /* measure_temperature */
        if (result.tmp.hasOwnProperty("value") && this.hasCapability('measure_temperature')) {
          this.updateCapabilityValue('measure_temperature', result.tmp.value);
        }

        /* measure_temperature */
        if (result.tmp.hasOwnProperty("tC") && this.hasCapability('measure_temperature')) {
          this.updateCapabilityValue('measure_temperature', result.tmp.tC);
        }

      }

      // TEMPERATURE (measure_temperature)
      if (result.hasOwnProperty("temperature") && this.hasCapability('measure_temperature')) {

        /* measure_temperature */
        this.updateCapabilityValue('measure_temperature', result.temperature);

      }

      // THERMOSTATS (target_temperature, measure_temperature)
      if (result.hasOwnProperty("thermostats") && this.hasCapability('measure_temperature')) {

        /* valve_position */
        if (result.thermostats[channel].hasOwnProperty("pos") && this.hasCapability('valve_position')) {
          if (result.thermostats[channel].pos != this.getCapabilityValue('valve_position')) {
            this.updateCapabilityValue('valve_position', result.thermostats[channel].pos);
            this.homey.flow.getDeviceTriggerCard('triggerValvePosition').trigger(this, {'position': result.thermostats[channel].pos}, {})
          }
        }

        /* valve_mode */
        if (result.thermostats[channel].hasOwnProperty("schedule") && result.thermostats[channel].hasOwnProperty("schedule_profile") && this.hasCapability('valve_mode')) {
          if (!result.thermostats[channel].schedule && this.getCapabilityValue('valve_position') !== "0") {
            this.updateCapabilityValue('valve_mode', "0");
          } else if (result.thermostats[channel].schedule && (result.thermostats[channel].schedule_profile.toString() !== this.getCapabilityValue('valve_mode'))) {
            this.updateCapabilityValue('valve_mode', result.thermostats[channel].schedule_profile.toString());
          }
        }

        /* target_temperature */
        if (result.thermostats[channel].hasOwnProperty("target_t") && this.hasCapability('measure_temperature')) {
          this.updateCapabilityValue('target_temperature', result.thermostats[channel].target_t.value);
        }

        /* measure_temperature */
        if (result.thermostats[channel].hasOwnProperty("tmp") && this.hasCapability('measure_temperature')) {
          this.updateCapabilityValue('measure_temperature', result.thermostats[channel].tmp.value);
        }

      }

      // ROLLERS (windowcoverings_state, windowcoverings_set)
      if (result.hasOwnProperty("rollers")) {

        /* windowcoverings_state */
        if (result.rollers[channel].hasOwnProperty("state")) {
          this.rollerState(result.rollers[channel].state);
        }

        /* windowcoverings_set */
        if (result.rollers[channel].hasOwnProperty("current_pos")) {
          var windowcoverings_set = result.rollers[channel].current_pos / 100;
          if (windowcoverings_set !== this.getCapabilityValue('windowcoverings_set')) {
            this.setStoreValue('previous_position', this.getCapabilityValue('windowcoverings_set'));
            this.updateCapabilityValue('windowcoverings_set', result.rollers[channel].current_pos);
          }
        }

      }

      // LIGHTS
      if (result.hasOwnProperty("lights")) {

        if (result.lights.hasOwnProperty([channel])) {

          /* onoff */
          if (result.lights[channel].hasOwnProperty("ison") && this.hasCapability('onoff')) {
            this.updateCapabilityValue('onoff', result.lights[channel].ison);
          }

          /* light_mode */
          if (result.lights[channel].hasOwnProperty("mode") && this.hasCapability('light_mode')) {
            var light_mode = result.lights[channel].mode === 'white' ? 'temperature' : 'color';
            if (light_mode != this.getCapabilityValue('light_mode') && this.getStoreValue('type') !== 'SHRGBW2') {
              this.updateCapabilityValue('light_mode', light_mode);
            }
          } else {
            var light_mode = 'temperature';
          }

          // Shelly DUO
          if (this.getStoreValue('type') === 'SHBDUO-1') {

            /* dim */
            let dim_duo = result.lights[channel].brightness > 100 ? 1 : result.lights[channel].brightness / 100;
            this.updateCapabilityValue('dim', dim_duo);

            /* light_temperature */
            let light_temperature_duo = 1 - (result.lights[channel].white / 100);
            this.updateCapabilityValue('light_temperature', light_temperature_duo);

          }

          // Shelly Bulb (RGB)
          if (this.getStoreValue('type') === 'SHBLB-1' || this.getStoreValue('type') === 'SHCB-1') {

            /* dim */
            if (light_mode === 'color') {
              var dim_bulb = result.lights[channel].gain > 100 ? 1 : result.lights[channel].gain / 100;
            } else {
              var dim_bulb = result.lights[channel].brightness > 100 ? 1 : result.lights[channel].brightness / 100;
            }
            this.updateCapabilityValue('dim', dim_bulb);

            /* light_temperature_temp */
            let light_temperature_bulb = 1 - Number(this.util.normalize(result.lights[channel].temp, 3000, 6500));
            this.updateCapabilityValue('light_temperature', light_temperature_bulb);

          }

          // Shelly RGBW2
          if (this.getStoreValue('type') === 'SHRGBW2') {

            /* dim and light_temperature in color mode */
            if (result.lights[channel].mode === 'color') {
              let dim_rgbw2color = result.lights[channel].gain > 100 ? 1 : result.lights[channel].gain / 100;
              this.updateCapabilityValue('dim', dim_rgbw2color);

              let light_temperature_rgbw2 = 1 - Number(this.util.normalize(result.lights[channel].white, 0, 255));
              this.updateCapabilityValue('light_temperature', light_temperature_rgbw2);

              if (result.lights[channel].white > 125 && !this.getCapabilityValue('onoff.whitemode')) {
                this.updateCapabilityValue('onoff.whitemode', true);
              } else if (result.lights[channel].white <= 125 && this.getCapabilityValue('onoff.whitemode')) {
                this.updateCapabilityValue('onoff.whitemode', false);
              }
            }

            /* dim white mode */
            if (result.lights[channel].mode === 'white') {
              let dim_rgbwwhite = result.lights[channel].brightness > 100 ? 1 : result.lights[channel].brightness / 100;
              this.updateCapabilityValue('dim', dim_rgbwwhite);
            }

          }

          /* light_hue & light_saturation */
          if (light_mode === 'color') {
            this.setStoreValue('red', result.lights[channel].red);
            this.setStoreValue('green', result.lights[channel].green);
            this.setStoreValue('blue', result.lights[channel].blue);

            let color = tinycolor({r: result.lights[channel].red, g: result.lights[channel].green, b: result.lights[channel].blue});
            let hsv = color.toHsv();
            let light_hue = Number((hsv.h / 360).toFixed(2));

            // capability light_hue
            this.updateCapabilityValue('light_hue', light_hue);

            // capability light_saturation
            this.updateCapabilityValue('light_saturation', hsv.s);

          }

        }

      }

      // SENSOR (alarm_motion, alarm_tamper, alarm_contact)
      if (result.hasOwnProperty("sensor")) {

        /* alarm_motion */
        if (result.sensor.hasOwnProperty("motion") && this.hasCapability('alarm_motion')) {
          this.updateCapabilityValue('alarm_motion', result.sensor.motion);
        }

        /* alarm_tamper */
        if (result.sensor.hasOwnProperty("vibration") && this.hasCapability('alarm_tamper')) {
          this.updateCapabilityValue('alarm_tamper', result.sensor.vibration);
        }

        /* alarm_contact */
        if (result.sensor.hasOwnProperty("state") && this.hasCapability('alarm_contact')) {
          let alarm_contact = result.sensor.state === 'open' ? true : false;
          this.updateCapabilityValue('alarm_contact', alarm_contact);
        }

      }

      // LUX (measure_luminance)
      if (result.hasOwnProperty("lux") && this.hasCapability('measure_luminance')) {

        /* measure_luminance */
        if (result.lux.hasOwnProperty("value")) {
          this.updateCapabilityValue('measure_luminance', result.lux.value);
        }

      }

      // ACCEL (alarm_tamper, tilt)
      if (result.hasOwnProperty("accel")) {

        /* alarm_tamper */
        if (result.accel.hasOwnProperty("vibration") && this.hasCapability('alarm_tamper')) {
          let alarm_tamper_accel = result.accel.vibration === 1 ? true : false;
          this.updateCapabilityValue('alarm_tamper', alarm_tamper_accel);
        }

        /* tilt */
        if (result.accel.hasOwnProperty("tilt") && this.hasCapability('tilt')) {
          this.updateCapabilityValue('tilt', result.accel.tilt);
        }

      }

      // FLOOD (alarm_water)
      if (result.hasOwnProperty("flood") && this.hasCapability('alarm_water')) {

        /* alarm_water */
        this.updateCapabilityValue('alarm_water', result.flood);

      }

      // GAS (alarm_smoke, gas_concentration)
      if (result.hasOwnProperty("gas_sensor") && this.hasCapability('alarm_smoke') && this.hasCapability('gas_concentration')) {

        /* alarm_smoke */
        if (result.gas_sensor.alarm_state == 'mild' || result.gas_sensor.alarm_state == 'heavy') {
          var alarm_gas = true;
        } else {
          var alarm_gas = false;
        }
        this.updateCapabilityValue('alarm_smoke', alarm_gas);

        /* concentration */
        this.updateCapabilityValue('gas_concentration', Number(result.concentration.ppm));

      }

      // SMOKE (alarm_smoke)
      if (result.hasOwnProperty("smoke") && this.hasCapability('alarm_smoke')) {

        /* alarm_smoke */
        this.updateCapabilityValue('alarm_smoke', result.smoke);

      }

      // HUM (measure_humidity)
      if (result.hasOwnProperty("hum") && this.hasCapability('measure_humidity')) {

        /* measure_humidity */
        if (result.hum.hasOwnProperty("value")) {
          this.updateCapabilityValue('measure_humidity', result.hum.value);
        }

      }

      // ADCS (measure_voltage)
      if (result.hasOwnProperty("adcs") && this.hasCapability('measure_voltage') && this.getStoreValue('channel') === 0) {

        /* measure_voltage */
        if (result.adcs.hasOwnProperty([0])) {
          if (result.adcs[0].hasOwnProperty("voltage")) {
            this.updateCapabilityValue('measure_voltage', result.adcs[0].voltage);
          }
        }
      }

      // INPUTS (input_1, input_2, input_3)
      if (result.hasOwnProperty("inputs")) {

        /* input_1 */
        if (result.inputs.hasOwnProperty([0]) && this.hasCapability('input_1') && this.getStoreValue('channel') === 0) {
          let input_1 = result.inputs[0].input == 1 ? true : false;
          if (input_1 !== this.getCapabilityValue('input_1')) {
            this.updateCapabilityValue('input_1', input_1);
            if (input_1) {
              this.homey.flow.getDeviceTriggerCard('triggerInput1On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInput1Off').trigger(this, {}, {});
            }
            this.homey.flow.getDeviceTriggerCard('triggerInput1Changed').trigger(this, {}, {});
          }

          // input/action event for cloud devices
          if (this.getStoreValue('communication') === 'cloud' && result.inputs[0].event_cnt > 0 && (result.inputs[0].event_cnt > this.getStoreValue('event_cnt')) && result.inputs[0].event) {
            if (this.hasCapability('input_1') && this.hasCapability('input_2')) {
              var action0 = this.util.getActionEventDescription(result.inputs[0].event) + '_1';
            } else {
              var action0 = this.util.getActionEventDescription(result.inputs[0].event);
            }
            this.setStoreValue('event_cnt', result.inputs[0].event_cnt);
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action0 }, {"id": this.getData().id, "device": this.getName(), "action": action0 });
          }
        }

        /* input_2 */
        if (result.inputs.hasOwnProperty([1]) && this.hasCapability('input_2')) {
          let input_2 = result.inputs[1].input == 1 ? true : false;
          if (input_2 !== this.getCapabilityValue('input_2')) {
            this.updateCapabilityValue('input_2', input_2);
            if (input_2) {
              this.homey.flow.getDeviceTriggerCard('triggerInput2On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInput2Off').trigger(this, {}, {});
            }
            this.homey.flow.getDeviceTriggerCard('triggerInput2Changed').trigger(this, {}, {});
          }
          // input/action events for cloud devices
          if (this.getStoreValue('communication') === 'cloud' && result.inputs[1].event_cnt > 0 && (result.inputs[1].event_cnt > this.getStoreValue('event_cnt')) && result.inputs[1].event) {
            var action1 = this.util.getActionEventDescription(result.inputs[1].event) + '_2';
            this.setStoreValue('event_cnt', result.inputs[1].event_cnt);
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action1 }, {"id": this.getData().id, "device": this.getName(), "action": action1 });
          }
        } else if (result.inputs.hasOwnProperty([1]) && this.hasCapability('input_1') && this.getStoreValue('channel') === 1) {
            let input_2_1 = result.inputs[1].input == 1 ? true : false;
            if (input_2_1 !== this.getCapabilityValue('input_1')) {
              this.updateCapabilityValue('input_1', input_2_1);
              if (input_2_1) {
                this.homey.flow.getDeviceTriggerCard('triggerInput1On').trigger(this, {}, {});
              } else {
                this.homey.flow.getDeviceTriggerCard('triggerInput1Off').trigger(this, {}, {});
              }
              this.homey.flow.getDeviceTriggerCard('triggerInput1Changed').trigger(this, {}, {});
            }
          // input/action events for cloud devices
          if (this.getStoreValue('communication') === 'cloud' && result.inputs[1].event_cnt > 0 && (result.inputs[1].event_cnt > this.getStoreValue('event_cnt')) && result.inputs[1].event) {
            var action1 = this.util.getActionEventDescription(result.inputs[1].event);
            this.setStoreValue('event_cnt', result.inputs[1].event_cnt);
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action1 }, {"id": this.getData().id, "device": this.getName(), "action": action1 });
          }
        }

        /* input_3 */
        if (result.inputs.hasOwnProperty([2]) && this.hasCapability('input_3')) {
          let input_3 = result.inputs[2].input == 1 ? true : false;
          if (input_3 !== this.getCapabilityValue('input_3')) {
            this.updateCapabilityValue('input_3', input_3);
            if (input_3) {
              this.homey.flow.getDeviceTriggerCard('triggerInput3On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInput3Off').trigger(this, {}, {});
            }
            this.homey.flow.getDeviceTriggerCard('triggerInput3Changed').trigger(this, {}, {});
          }

          // input/action events for cloud devices
          if (this.getStoreValue('communication') === 'cloud' && result.inputs[2].event_cnt > 0 && (result.inputs[2].event_cnt > this.getStoreValue('event_cnt')) && result.inputs[2].event) {
            const action2 = await this.util.getActionEventDescription(result.inputs[2].event) + '_3';
            this.setStoreValue('event_cnt', result.inputs[2].event_cnt);
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action2 }, {"id": this.getData().id, "device": this.getName(), "action": action2 });
          }
        }

      }

      // EXT_TEMPERATURE (measure_temperature.1, measure_temperature.2, measure_temperature.3)
      if (result.hasOwnProperty("ext_temperature")) {

        /* measure_temperature.1 */
        if (result.ext_temperature.hasOwnProperty([0]) && !this.hasCapability('measure_temperature.1') && this.getStoreValue('channel') === 0) {
          this.addCapability('measure_temperature.1');
        } else if (result.ext_temperature.hasOwnProperty([0]) && this.hasCapability('measure_temperature.1')) {
          let temp1 = result.ext_temperature[0].tC;
          if (temp1 != this.getCapabilityValue('measure_temperature.1')) {
            this.updateCapabilityValue('measure_temperature.1', temp1);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature1').trigger(this, {'temperature': temp1}, {});
          }
        }

        /* measure_temperature.2 */
        if (result.ext_temperature.hasOwnProperty([1]) && !this.hasCapability('measure_temperature.2') && this.getStoreValue('channel') === 0) {
          this.addCapability('measure_temperature.2');
        } else if (result.ext_temperature.hasOwnProperty([1]) && this.hasCapability('measure_temperature.2')) {
          let temp2 = result.ext_temperature[1].tC;
          if (temp2 != this.getCapabilityValue('measure_temperature.2')) {
            this.updateCapabilityValue('measure_temperature.2', temp2);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature2').trigger(this, {'temperature': temp2}, {});
          }
        }

        /* measure_temperature.3 */
        if (result.ext_temperature.hasOwnProperty([2]) && !this.hasCapability('measure_temperature.3') && this.getStoreValue('channel') === 0) {
          this.addCapability('measure_temperature.3');
        } else if (result.ext_temperature.hasOwnProperty([2]) && this.hasCapability('measure_temperature.3')) {
          let temp3 = result.ext_temperature[2].tC;
          if (temp3 != this.getCapabilityValue('measure_temperature.3')) {
            this.updateCapabilityValue('measure_temperature.3', temp3);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature3').trigger(this, {'temperature': temp3}, {});
          }
        }

      }

      // EXT_SWITCH
      if (result.hasOwnProperty("ext_switch")) {
        if (result.ext_switch.hasOwnProperty([0]) && !this.hasCapability('input_external')) {
          this.addCapability('input_external');
        } else if (result.ext_switch.hasOwnProperty([0]) && this.hasCapability('input_external')) {
          let input_external = result.ext_switch[0].input === 0 ? false : true;
          if (input_external != this.getCapabilityValue('input_external')) {
            this.updateCapabilityValue('input_external', input_external);
            if (input_external) {
              this.homey.flow.getDeviceTriggerCard('triggerInputExternal1On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInputExternal1Off').trigger(this, {}, {});
            }
          }
        }
      }

      // EXT_HUMIDITY
      if (result.hasOwnProperty("ext_humidity")) {

        /* measure_humidity */
        if (result.ext_humidity.hasOwnProperty([0]) && !this.hasCapability('measure_humidity')) {
          this.addCapability('measure_humidity');
        } else if (result.ext_humidity.hasOwnProperty([0]) && this.hasCapability('measure_humidity')) {
          this.updateCapabilityValue('measure_humidity', result.ext_humidity[0].hum);
        }

      }

      // RSSI
      if (result.hasOwnProperty("wifi_sta")) {

        /* rssi */
        if (result.wifi_sta.hasOwnProperty("rssi") && this.hasCapability("rssi")) {
          this.updateCapabilityValue('rssi', result.wifi_sta.rssi);
        }

      }

      // firmware update available?
      if (result.hasOwnProperty("update")) {
        if (result.update.has_update === true && (this.getStoreValue('latest_firmware') !== result.update.new_version)) {
          this.homey.flow.getTriggerCard('triggerFWUpdate').trigger({"id": this.getData().id, "device": this.getName(), "firmware": result.update.new_version});
          this.setStoreValue("latest_firmware", result.update.new_version);
        }
      }

      // update unicast
      if (this.getStoreValue('communication') === 'coap' && !this.getStoreValue('unicast') === true && this.getStoreValue('battery') === false && this.getStoreValue('type') !== 'SHSW-44') {
        const result = await this.util.setUnicast(this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        if (result === 'OK') {
          this.setStoreValue("unicast", true);
        }
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

  /* generic status updates parser for polling over local HTTP REST API and Cloud for GEN2 */
  async parseStatusUpdateGen2(result) {
    try {
      let channel = this.getStoreValue('channel') || 0;

      // SWITCH component
      if (result.hasOwnProperty("switch:"+ channel)) {

        /* onoff */
        if (result["switch:"+channel].hasOwnProperty("output") && this.hasCapability('onoff')) {
          this.updateCapabilityValue('onoff', result["switch:"+channel].output, channel);
        }

      }

      // COVER / ROLLERSHUTTER COMPONENT
      if (result.hasOwnProperty("cover:"+ channel)) {

        /* windowcoverings_state */
        if (result["cover:"+channel].hasOwnProperty("current_pos") && this.hasCapability('windowcoverings_state')) {
          this.rollerState(result["cover:"+channel].state);
        }

        /* windowcoverings_set */
        if (result["cover:"+channel].hasOwnProperty("current_pos") && this.hasCapability('windowcoverings_set')) {
          let windowcoverings_set = result["cover:"+channel].current_pos / 100;
          this.updateCapabilityValue('windowcoverings_set', windowcoverings_set, channel);
        }

      }

      // MEASURE POWER, METER POWER AND TEMPERATURE FOR SWITCH AND COVER COMPONENT
      if (result.hasOwnProperty("switch:"+ channel) || result.hasOwnProperty("cover:"+ channel) ) {

        let component = result.hasOwnProperty("switch:"+ channel) ? result["switch:"+ channel] : result["cover:"+ channel];

        /* measure_power */
        if (component.hasOwnProperty("apower") && this.hasCapability('measure_power')) {
          this.updateCapabilityValue('measure_power', component.apower, channel);
        }

        /* meter_power */
        if (component.hasOwnProperty("aenergy") && this.hasCapability('meter_power')) {
          if (component.aenergy.hasOwnProperty("total")) {
            let meter_power = component.aenergy.total / 1000;
            this.updateCapabilityValue('meter_power', meter_power, channel);
          }
        }

        /* measure_voltage */
        if (component.hasOwnProperty("voltage") && this.hasCapability('measure_voltage')) {
          this.updateCapabilityValue('measure_voltage', component.voltage, channel);
        }

        /* measure_current */
        if (component.hasOwnProperty("current") && this.hasCapability('measure_current')) {
          this.updateCapabilityValue('measure_current', component.current, channel);
        }

        /* measure_temperature (device temperature) */
        if (component.hasOwnProperty("temperature") && this.hasCapability('measure_temperature')) {
          this.updateCapabilityValue('measure_temperature', component.temperature.tC, 0);
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
      if (result.hasOwnProperty("sys")) {
        if (result.sys.available_updates.hasOwnProperty("stable")) {
          this.homey.flow.getTriggerCard('triggerFWUpdate').trigger({"id": this.getData().id, "device": this.getName(), "firmware": result.sys.available_updates.stable.version });
          this.setStoreValue("latest_firmware", result.sys.available_updates.stable.version);
        }
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
  async connectWebsocket() { }

  /* process capability updates from CoAP and gen2 websocket devices */
  async parseCapabilityUpdate(capability, value, channel = 0) {
    try {
      if (!this.getAvailable()) { this.setAvailable(); }

      // update unicast for battery devices
      if (this.getStoreValue('battery') === true && !this.getStoreValue('unicast') === true) {
        const result = await this.util.setUnicast(this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        if (result === 'OK') {
          this.setStoreValue("unicast", true);
        }
      }

      switch(capability) {
        case 'output':
        case 'relay0':
        case 'relay1':
        case 'relay2':
        case 'relay3':
        case 'switch':
        case 'switch0':
        case 'switch1':
        case 'switch2':
        case 'switch3':
          this.updateCapabilityValue('onoff', value, channel);
          break;
        case 'apower':
        case 'power0':
        case 'power1':
        case 'power2':
        case 'power3':
          this.updateCapabilityValue('measure_power', value, channel);
          break;
        case 'energyCounter0':
        case 'energyCounter1':
        case 'energyCounter2':
        case 'energyCounter3':
          if (this.getStoreValue('type') === 'SHEM' || this.getStoreValue('type') === 'SHEM-3') {
            var meter_power = value / 1000;
          } else {
            var meter_power = value * 0.000017;
          }
          this.updateCapabilityValue('meter_power', meter_power, channel);
          break;
        case 'total':
          var meter_power = value / 1000;
          this.updateCapabilityValue('meter_power', meter_power, channel);
          break;
        case 'energyReturned0':
        case 'energyReturned1':
        case 'energyReturned2':
          let meter_power_returned = value / 1000;
          let meter_power_returned_rounded = Number(meter_power_returned.toFixed(3));
          if (meter_power_returned_rounded != this.getCapabilityValue('meter_power_returned')) {
            this.updateCapabilityValue('meter_power_returned', meter_power_returned_rounded, channel);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned').trigger(this, {'energy': meter_power_returned_rounded}, {});
          }
          break;
        case 'powerFactor0':
        case 'powerFactor1':
        case 'powerFactor2':
          if (value != this.getCapabilityValue('meter_power_factor')) {
            this.updateCapabilityValue('meter_power_factor', value, channel);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerFactor').trigger(this, {'pf': value}, {});
          }
          break;
        case 'current':
        case 'current0':
        case 'current1':
        case 'current2':
          this.updateCapabilityValue('measure_current', value, channel);
          break;
        case 'voltage':
        case 'voltage0':
        case 'voltage1':
        case 'voltage2':
          this.updateCapabilityValue('measure_voltage', value, channel);
          break;
        case 'overPower':
        case 'overPower0':
        case 'overPower1':
          if (value) {
            this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": this.getName(), "device_error": this.homey.__('device.overpower')});
          }
          break;
        case 'battery':
          this.updateCapabilityValue('measure_battery', value, channel);
          break;
        case 'tC':
        case 'deviceTemperature':
        case 'temperature':
        case 'temp':
          this.updateCapabilityValue('measure_temperature', value, channel);
          break;
        case 'targetTemperature':
          this.updateCapabilityValue('target_temperature', value, channel);
          break;
        case 'valvePosition':
          if (value != this.getCapabilityValue('valve_position')) {
            this.updateCapabilityValue('valve_position', value, channel);
            this.homey.flow.getDeviceTriggerCard('triggerValvePosition').trigger(this, {'position': value}, {})
          }
          break;
        case 'rollerState':
          this.rollerState(value);
          break;
        case 'rollerPosition':
        case 'current_pos':
          let windowcoverings_set = value / 100;
          this.setStoreValue('previous_position', this.getCapabilityValue('windowcoverings_set'));
          this.updateCapabilityValue('windowcoverings_set', windowcoverings_set, channel);
          break;
        case 'gain':
        case 'brightness':
        case 'brightness0':
        case 'brightness1':
        case 'brightness2':
        case 'brightness3':
          let dim = value >= 100 ? 1 : value / 100;
          this.updateCapabilityValue('dim', dim, channel);
          break;
        case 'mode':
          if (this.getStoreValue('type') === 'SHTRV-01') {
            this.updateCapabilityValue('valve_mode', value.toString());
          } else {
            let light_mode = value === 'white' ? 'temperature' : 'color';
            this.updateCapabilityValue('light_mode', light_mode, channel);
          }
          break;
        case 'colorTemperature':
          if (this.getStoreValue('type') === 'SHBDUO-1') {
            value = value === 0 ? 2700 : value;
            var light_temperature = 1 - Number(this.util.normalize(value, 2700, 6500)); // Shelly Duo
          } else {
            value = value === 0 ? 3000 : value;
            var light_temperature = 1 - Number(this.util.normalize(value, 3000, 6500)); // Shelly Bulb
          }
          this.updateCapabilityValue('light_temperature', light_temperature, channel);
          break;
        case 'whiteLevel':
          let light_temperature_whitelevel = 1 - value / 100;
          this.updateCapabilityValue('light_temperature', light_temperature_whitelevel, channel);
          break;
        case 'white':
          let light_temperature_white = 1 - Number(this.util.normalize(value, 0, 255));
          this.updateCapabilityValue('light_temperature', light_temperature_white, channel);
          if (value > 220 && !this.getCapabilityValue('onoff.whitemode')) {
            this.setCapabilityValue('onoff.whitemode', true);
            this.setCapabilityValue('light_mode', 'temperature');
          } else if (value >= 0 && value <= 220 && this.getCapabilityValue('onoff.whitemode')) {
            this.setCapabilityValue('onoff.whitemode', false);
            this.setCapabilityValue('light_mode', 'color');
          }
          break;
        case 'red':
          this.setStoreValue('red', value);
          this.updateDeviceRgb();
          break;
        case 'green':
          this.setStoreValue('green', value);
          this.updateDeviceRgb();
          break;
        case 'blue':
          this.setStoreValue('blue', value);
          this.updateDeviceRgb();
          break;
        case 'motion':
          value = value === 1 || value ? true : false;
          this.updateCapabilityValue('alarm_motion', value, channel);
          break;
        case 'vibration':
          value = value === 1 || value ? true : false;
          this.updateCapabilityValue('alarm_tamper', value, channel);
          break;
        case 'state':
          if (this.hasCapability('windowcoverings_state')) {
            this.rollerState(value);
          } else if (this.hasCapability('alarm_contact')) {
            value = value === 1 || value ? true : false;
            this.updateCapabilityValue('alarm_contact', value, channel);
          }
          break;
        case 'flood':
          value = value === 1 || value ? true : false;
          this.updateCapabilityValue('alarm_water', value, channel);
          break;
        case 'tilt':
          if (value != this.getCapabilityValue('tilt')) {
            this.updateCapabilityValue('tilt', value, channel);
            this.homey.flow.getDeviceTriggerCard('triggerTilt').trigger(this, {'tilt': value}, {});
          }
          break;
        case 'illuminance':
          this.updateCapabilityValue('measure_luminance', value, channel);
          break;
        case 'gas':
          if (value === 'mild' || value === 'heavy') {
            var alarm = true;
          } else {
            var alarm = false;
          }
          this.updateCapabilityValue('alarm_smoke', alarm, channel);
          break;
        case 'concentration':
          if (value != this.getCapabilityValue('gas_concentration')) {
            this.updateCapabilityValue('gas_concentration', value, channel);
            this.homey.flow.getDeviceTriggerCard('triggerGasConcentration').trigger(this, {'ppm': value}, {})
          }
          break;
        case 'smoke':
          value = value === 1 || value ? true : false;
          this.updateCapabilityValue('alarm_smoke', value, channel);
          break;
        case 'input0':
          if (typeof value == 'number') {
            value = value === 0 ? false : true;
          }
          if (value !== this.getCapabilityValue('input_1')) {
            this.updateCapabilityValue('input_1', value, channel);
            if (value) {
              this.homey.flow.getDeviceTriggerCard('triggerInput1On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInput1Off').trigger(this, {}, {});
            }
            this.homey.flow.getDeviceTriggerCard('triggerInput1Changed').trigger(this, {}, {});
          }
          break;
        case 'input1':
          if (typeof value == 'number') {
            value = value === 0 ? false : true;
          }
          if (!this.hasCapability('input_2')) {
            if (value !== this.getCapabilityValue('input_1')) {
              this.updateCapabilityValue('input_1', value, channel);
              if (value) {
                this.homey.flow.getDeviceTriggerCard('triggerInput1On').trigger(this, {}, {});
              } else {
                this.homey.flow.getDeviceTriggerCard('triggerInput1Off').trigger(this, {}, {});
              }
              this.homey.flow.getDeviceTriggerCard('triggerInput1Changed').trigger(this, {}, {});
            }
          } else {
            if (value !== this.getCapabilityValue('input_2')) {
              this.updateCapabilityValue('input_2', value, channel);
              if (value) {
                this.homey.flow.getDeviceTriggerCard('triggerInput2On').trigger(this, {}, {});
              } else {
                this.homey.flow.getDeviceTriggerCard('triggerInput2Off').trigger(this, {}, {});
              }
              this.homey.flow.getDeviceTriggerCard('triggerInput2Changed').trigger(this, {}, {});
            }
          }
          break;
        case 'input2':
          if (typeof value == 'number') {
            value = value === 0 ? false : true;
          }
          if (value != this.getCapabilityValue('input_3')) {
            this.updateCapabilityValue('input_3', value, channel);
            if (value) {
              this.homey.flow.getDeviceTriggerCard('triggerInput3On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInput3Off').trigger(this, {}, {});
            }
            this.homey.flow.getDeviceTriggerCard('triggerInput3Changed').trigger(this, {}, {});
          }
          break;
        case 'input3':
          if (typeof value == 'number') {
            value = value === 0 ? false : true;
          }
          if (value != this.getCapabilityValue('input_4')) {
            this.updateCapabilityValue('input_4', value, channel);
            if (value) {
              this.homey.flow.getDeviceTriggerCard('triggerInput4On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInput4Off').trigger(this, {}, {});
            }
            this.homey.flow.getDeviceTriggerCard('triggerInput4Changed').trigger(this, {}, {});
          }
          break;
        case 'inputEvent0':
          if (this.hasCapability('input_1') && this.hasCapability('input_2')) {
            let actionEvent1 = this.util.getActionEventDescription(value) + '_1';
            this.setStoreValue('actionEvent1', actionEvent1);
          } else {
            let actionEvent1 = this.util.getActionEventDescription(value);
            this.setStoreValue('actionEvent', actionEvent1);
          }
          break;
        case 'inputEvent1':
          if (this.hasCapability('input_1') && this.hasCapability('input_2')) {
            let actionEvent2 = this.util.getActionEventDescription(value) + '_2';
            this.setStoreValue('actionEvent2', actionEvent2);
          } else {
            let actionEvent2 = this.util.getActionEventDescription(value);
            this.setStoreValue('actionEvent', actionEvent2);
          }
          break;
        case 'inputEvent2':
          let actionEvent3 = this.util.getActionEventDescription(value) + '_3';
          this.setStoreValue('actionEvent3', actionEvent3);
          break;
        case 'inputEventCounter0':
          if (this.hasCapability('input_1') && this.hasCapability('input_2')) {
            if (value > 0) {
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent1')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent1')});
            }
          } else {
            if (value > 0) {
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')});
            }
          }
          break;
        case 'inputEventCounter1':
          if (this.hasCapability('input_1') && this.hasCapability('input_2')) {
            if (value > 0) {
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent2')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent2')});
            }
          } else {
            if (value > 0) {
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')});
            }
          }
          break;
        case 'inputEventCounter2':
          if (value > 0) {
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent3')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent3')});
          }
          break;
        case 'externalTemperature0':
          if (value != this.getCapabilityValue('measure_temperature.1')) {
            this.updateCapabilityValue('measure_temperature.1', value, channel);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature1').trigger(this, {'temperature': value}, {});
          }
          break;
        case 'externalTemperature1':
          if (value != this.getCapabilityValue('measure_temperature.2')) {
            this.updateCapabilityValue('measure_temperature.2', value, channel);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature2').trigger(this, {'temperature': value}, {});
          }
          break;
        case 'externalTemperature2':
          if (value != this.getCapabilityValue('measure_temperature.3')) {
            this.updateCapabilityValue('measure_temperature.3', value, channel);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature3').trigger(this, {'temperature': value}, {});
          }
          break;
        case 'externalInput0':
          let input_external = value === 0 ? false : true;
          if (input_external != this.getCapabilityValue('input_external')) {
            this.updateCapabilityValue('input_external', input_external, channel);
            if (input_external) {
              this.homey.flow.getDeviceTriggerCard('triggerInputExternal1On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInputExternal1Off').trigger(this, {}, {});
            }
          }
          break;
        case 'humidity':
        case 'externalHumidity':
          this.updateCapabilityValue('measure_humidity', value, channel);
          break;
        case 'rollerStopReason':
        case 'wakeUpEvent':
          break;
        default:
          //this.log('Device does not support reported capability '+ capability +' with value '+ value);
      }
      return Promise.resolve(true);
    } catch(error) {
      this.log(error);
      return Promise.reject(error);
    }
  }

  updateDeviceRgb() {
    try {
      clearTimeout(this.updateDeviceRgbTimeout);
      this.updateDeviceRgbTimeout = this.homey.setTimeout(() => {
        let color = tinycolor({ r: this.getStoreValue('red'), g: this.getStoreValue('green'), b: this.getStoreValue('blue') });
        let hsv = color.toHsv();
        let light_hue = Number((hsv.h / 360).toFixed(2));
        this.updateCapabilityValue('light_hue', light_hue);
        this.updateCapabilityValue('light_saturation', hsv.v);
      }, 2000);
    } catch (error) {
      this.log(error);
    }
  }

  rollerState(value) {
    try {
      switch(value) {
        case 'stop':
          var windowcoverings_state = 'idle'
          break;
        case 'open':
        case 'opening':
          var windowcoverings_state = 'up';
          break;
        case 'close':
        case 'closed':
        case 'closing':
          var windowcoverings_state = 'down';
          break;
        default:
          var windowcoverings_state = value;
      }
      if (windowcoverings_state !== 'idle' && windowcoverings_state !== this.getStoreValue('last_action')) {
        this.setStoreValue('last_action', windowcoverings_state);
      }
      this.updateCapabilityValue('windowcoverings_state', windowcoverings_state);
    } catch (error) {
      this.log(error);
    }
  }

  getCommandId() {
    return this.commandId++
  }

}

module.exports = ShellyDevice;
