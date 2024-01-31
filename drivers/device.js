'use strict';

const Homey = require('homey');
const Util = require('../lib/util.js');
const WebSocket = require('ws');
const tinycolor = require("tinycolor2");

class ShellyDevice extends Homey.Device {

  onInit() {
    try {
      if (!this.util) this.util = new Util({homey: this.homey});

      // VARIABLES GENERIC
      this.pollingFailures = 0;
    
      // ADDING CAPABILITY LISTENERS
      this.registerCapabilityListener("onoff", this.onCapabilityOnoff.bind(this));
      this.registerCapabilityListener("onoff.1", this.onCapabilityOnoff1.bind(this));
      this.registerCapabilityListener("onoff.2", this.onCapabilityOnoff2.bind(this));
      this.registerCapabilityListener("onoff.3", this.onCapabilityOnoff3.bind(this));
      this.registerCapabilityListener("onoff.4", this.onCapabilityOnoff4.bind(this));
      this.registerCapabilityListener("onoff.5", this.onCapabilityOnoff5.bind(this));
      this.registerCapabilityListener("dim", this.onCapabilityDim.bind(this));
      this.registerCapabilityListener("light_temperature", this.onCapabilityLightTemperature.bind(this));
      this.registerMultipleCapabilityListener(['light_hue', 'light_saturation'], this.onMultipleCapabilityListenerSatHue.bind(this), 500);
      this.registerCapabilityListener("light_mode", this.onCapabilityLightMode.bind(this));
      this.registerCapabilityListener("onoff.whitemode", this.onCapabilityOnoffWhiteMode.bind(this));
      this.registerCapabilityListener("windowcoverings_state", this.onCapabilityWindowcoveringsState.bind(this));
      this.registerCapabilityListener("windowcoverings_set", this.onCapabilityWindowcoveringsSet.bind(this));
      this.registerCapabilityListener("valve_position", this.onCapabilityValvePosition.bind(this));
      this.registerCapabilityListener("valve_mode", this.onCapabilityValveMode.bind(this));
      this.registerCapabilityListener("target_temperature", this.onCapabilityTargetTemperature.bind(this));

      // ADDING MAINTENANCE ACTIONS
      this.registerCapabilityListener("button.enable_ble_script", this.onMaintenanceEnableBLEPRoxy.bind(this));
      this.registerCapabilityListener("button.disable_ble_script", this.onMaintenanceDisableBLEPRoxy.bind(this));

      // INIT SEQUENCE
      this.homey.setTimeout(async () => {
        try {

          /* update device config */
          await this.updateDeviceConfig();

          /* register device trigger cards */
          let triggers = [];
          if (this.getStoreValue('config').triggers !== undefined) {
            triggers = this.getStoreValue('config').triggers
          } else if (this.getStoreValue('channel') !== 0) {
            triggers = this.getStoreValue('config').triggers_2
          } else {
            triggers = this.getStoreValue('config').triggers_1
          }
          for (const trigger of triggers) {
            this.homey.flow.getDeviceTriggerCard(trigger);
          }

          /* start polling & check communication config */
          await this.bootSequence();

        } catch (error) {
          this.log(error);
        }
      }, 2000);

    } catch (error) {
      this.error(error);
    }
  }

  /* onAdded() */
  async onAdded() {
    try {

      // all devices: update Shelly collection
      if (this.getStoreValue('channel') === 0) {
        this.homey.setTimeout(async () => {
          try {
            return await this.homey.app.updateShellyCollection();
          } catch (error) {
            this.error(error);
          }
        }, 5000);
      }

      // coap + websocket: initially poll the device status
      if (!this.getStoreValue('battery') && this.getStoreValue('channel') === 0 && (this.getStoreValue('communication') === 'coap' || this.getStoreValue('communication') === 'websocket')) {
        this.homey.setTimeout(() => {
          try {
            this.pollDevice();
          } catch (error) {
            this.error(error);
          }
        }, 6000 + (1000 * this.getStoreValue('channel')));
      }

      // coap: (re)start coap
      if (this.getStoreValue('communication') === 'coap') {
        this.homey.setTimeout(() => {
          try {
            this.homey.app.restartCoapListener();
          } catch (error) {
            this.error(error);
          }
        }, 7000);
      }

      // websocket: start websocket server if device has the WS server configured during pairing
      if (this.getStoreValue('communication') === 'websocket' && this.getStoreValue('wsserver')) {
        this.homey.setTimeout(() => {
          try {
            this.homey.app.websocketLocalListener();
          } catch (error) {
            this.error(error);
          }
        }, 7000);
      }
    } catch (error) {
      this.error(error);
    }
  }

  /* onSettings */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    return await this.homey.app.updateShellyCollection();
  }

  /* boot sequence */
  async bootSequence() {
    try {

      // initially set the device as available
      this.homey.setTimeout(async () => {
        await this.setAvailable().catch(this.error);
      }, 1000);

      // coap + websocket: start polling mains powered devices on regular interval
      if (!this.getStoreValue('battery') && this.getStoreValue('channel') === 0 && (this.getStoreValue('communication') === 'coap' || this.getStoreValue('communication') === 'websocket')) {
        this.pollingInterval = this.homey.setInterval(() => {
          this.pollDevice();
        }, (60000 + this.util.getRandomTimeout(20)));
      }

      // validate communication configuration
      if (!this.getStoreValue('battery') && this.getStoreValue('channel') === 0 && this.getStoreValue('communication') === 'coap') {
        const homey_ip = await this.homey.cloud.getLocalAddress();
        if (this.getStoreValue('device_settings').hasOwnProperty('coiot')) {
          if (this.getStoreValue('device_settings').coiot.enabled === false || (this.getStoreValue('device_settings').coiot.enabled === true && !this.getStoreValue('device_settings').coiot.peer.includes(homey_ip.substring(0, homey_ip.length-3)) && this.getStoreValue('device_settings').coiot.peer !== "")) {
            await this.util.setUnicast(this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
          }
        }
      } else if (!this.getStoreValue('battery') && this.getStoreValue('channel') === 0 && this.getStoreValue('communication') === 'websocket') {
        const homey_ip = await this.homey.cloud.getLocalAddress();
        if (this.getStoreValue('device_settings').hasOwnProperty('ws')) {
          if (this.getStoreValue('device_settings').ws.enable === false || !this.getStoreValue('device_settings').ws.server.includes(homey_ip.substring(0, homey_ip.length-3))) {
            await this.util.setWsServer(this.getSetting('address'), this.getSetting('password'));
          }
        }
      }

    } catch (error) {
      this.error(error.message);
    }
  }

  // CAPABILITY LISTENERS

  /* onoff relay */
  async onCapabilityOnoff(value, opts) {
    try {
      switch(this.getStoreValue('communication')) {
        case 'websocket': {
          let component_websocket = this.getClass() === 'light' ? 'Light' : 'Switch';
          return await this.util.sendRPCCommand('/rpc/'+ component_websocket +'.Set?id='+ this.getStoreValue("channel") +'&on='+ value, this.getSetting('address'), this.getSetting('password'));
        }
        case 'coap': {
          if (this.getClass() === 'light') {
            const light_config = this.getStoreValue('config').extra.light;
            var onoff_coap = value ? '/'+ light_config.light_endpoint +'/'+ this.getStoreValue("channel") +'?turn=on' : '/'+ light_config.light_endpoint +'/'+ this.getStoreValue("channel") +'?turn=off';
          } else {
            var onoff_coap = value ? '/relay/'+ this.getStoreValue("channel") +'?turn=on' : '/relay/'+ this.getStoreValue("channel") +'?turn=off';
          }
          return await this.util.sendCommand(onoff_coap, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        }
        case 'cloud': {
          const component_cloud = this.getClass() === 'light' ? 'light' : 'relay';
          const onoff = value ? 'on' : 'off';
          return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: component_cloud, command_param: 'turn', command_value: onoff, deviceid: String(this.getSetting('cloud_device_id')), channel: this.getStoreValue('channel')})]);
        }
        default:
          break;
      }
    } catch (error) {
      this.error(error);
    }
  }

  /* onoff.1 add-on relay */
  async onCapabilityOnoff1(value, opts) {
    try {
      return await this.util.sendRPCCommand('/rpc/Switch.Set?id=100&on='+ value, this.getSetting('address'), this.getSetting('password'));
    } catch (error) {
      this.error(error);
    }
  }

  /* onoff.2 add-on relay */
  async onCapabilityOnoff2(value, opts) {
    try {
      return await this.util.sendRPCCommand('/rpc/Switch.Set?id=101&on='+ value, this.getSetting('address'), this.getSetting('password'));
    } catch (error) {
      this.error(error);
    }
  }

  /* onoff.3 add-on relay */
  async onCapabilityOnoff3(value, opts) {
    try {
      return await this.util.sendRPCCommand('/rpc/Switch.Set?id=102&on='+ value, this.getSetting('address'), this.getSetting('password'));
    } catch (error) {
      this.error(error);
    }
  }

  /* onoff.4 add-on relay */
  async onCapabilityOnoff4(value, opts) {
    try {
      return await this.util.sendRPCCommand('/rpc/Switch.Set?id=103&on='+ value, this.getSetting('address'), this.getSetting('password'));
    } catch (error) {
      this.error(error);
    }
  }

  /* onoff.5 add-on relay */
  async onCapabilityOnoff5(value, opts) {
    try {
      return await this.util.sendRPCCommand('/rpc/Switch.Set?id=104&on='+ value, this.getSetting('address'), this.getSetting('password'));
    } catch (error) {
      this.error(error);
    }
  }

  /* onoff light */
  async onCapabilityOnoffLight(value, opts) {
    try {
      switch(this.getStoreValue('communication')) {
        case 'websocket': {
          return await this.util.sendRPCCommand('/rpc/Light.Set?id='+ this.getStoreValue("channel") +'&on='+ value, this.getSetting('address'), this.getSetting('password'));
        }
        case 'coap': {
          const path = value ? '/light/'+ this.getStoreValue("channel") +'?turn=on' : '/light/'+ this.getStoreValue("channel") +'?turn=off';
          return await this.util.sendCommand(path, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        }
        case 'cloud': {
          const onoff = value ? 'on' : 'off';
          return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', command_param: 'turn', command_value: onoff, deviceid: String(this.getSetting('cloud_device_id')), channel: this.getStoreValue('channel')})]);
        }
        default:
          break;
      }
    } catch (error) {
      this.error(error);
    }
  }

  /* windowcoverings_state */
  async onCapabilityWindowcoveringsState(value, opts) {
    try {
      if (value !== 'idle' && value !== this.getStoreValue('last_action')) {
        await this.setStoreValue('last_action', value);
      }
      switch(this.getStoreValue('communication')) {
        case 'websocket': {
          switch (value) {
            case 'idle':
              return await this.util.sendRPCCommand('/rpc/Cover.Stop?id='+ this.getStoreValue("channel"), this.getSetting('address'), this.getSetting('password'));
            case 'up':
              return await this.util.sendRPCCommand('/rpc/Cover.Open?id='+ this.getStoreValue("channel"), this.getSetting('address'), this.getSetting('password'));
            case 'down':
              return await this.util.sendRPCCommand('/rpc/Cover.Close?id='+ this.getStoreValue("channel"), this.getSetting('address'), this.getSetting('password'));
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
              return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'roller', command_param: 'go', command_value: 'stop', deviceid: String(this.getSetting('cloud_device_id')), channel: this.getStoreValue('channel')})]);
            case 'up':
              return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'roller', command_param: 'go', command_value: 'open', deviceid: String(this.getSetting('cloud_device_id')), channel: this.getStoreValue('channel')})]);
            case 'down':
              return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'roller', command_param: 'go', command_value: 'close', deviceid: String(this.getSetting('cloud_device_id')), channel: this.getStoreValue('channel')})]);
            default:
              return Promise.reject('State not recognized ...');
          }
        }
        default:
          break;
      }
    } catch (error) {
      this.error(error);
    }
  }

  /* windowcoverings_set */
  async onCapabilityWindowcoveringsSet(value, opts) {
    try {
      await this.setStoreValue('previous_position', this.getCapabilityValue('windowcoverings_set'));
      switch(this.getStoreValue('communication')) {
        case 'websocket': {
          return await this.util.sendRPCCommand('/rpc/Cover.GoToPosition?id='+ this.getStoreValue("channel") +'&pos='+ Math.round(value*100), this.getSetting('address'), this.getSetting('password'));
        }
        case 'coap': {
          return await this.util.sendCommand('/roller/0?go=to_pos&roller_pos='+ Math.round(value*100), this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        }
        case 'cloud':
          return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'roller_to_pos', command_param: 'pos', command_value: Math.round(value*100), deviceid: String(this.getSetting('cloud_device_id')), channel: this.getStoreValue('channel')})]);
        default:
          break;
      }
    } catch (error) {
      this.error(error);
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
        const light_config = this.getStoreValue('config').extra.light;
        let dim_component = light_config.dim_component;

         /* dim gain or brightness depending on light_mode for Shelly Bulb (RGBW) */
        if (this.getStoreValue('config').name === 'Shelly Bulb' || this.getStoreValue('config').name === 'Shelly Bulb RGBW') {
          if (this.getCapabilityValue('light_mode') === 'color') {
            dim_component = 'gain';
          }
        }

        switch(this.getStoreValue('communication')) {
          case 'websocket': {
            const dim_websocket = value === 0 ? 1 : value * 100;
            const onoff_websocket = value === 0 ? false : true;
            return await this.util.sendRPCCommand('/rpc/Light.Set?id='+ this.getStoreValue("channel") +'&on='+ onoff_websocket +'&brightness='+ dim_websocket, this.getSetting('address'), this.getSetting('password'));
          }
          case 'coap': {
            const dim_coap = value === 0 ? 1 : value * 100;
            const onoff_coap = value === 0 ? 'off' : 'on';
            
            if (!this.getCapabilityValue('onoff')) {
              return await this.util.sendCommand('/'+ light_config.light_endpoint +'/'+ this.getStoreValue('channel') +'?turn='+ onoff_coap +'&'+ dim_component +'='+ dim_coap +'&transition='+ opts.duration +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
            } else {
              return await this.util.sendCommand('/'+ light_config.light_endpoint +'/'+ this.getStoreValue('channel') +'?'+ dim_component +'='+ dim_coap +'&transition='+ opts.duration +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
            }
          }
          case 'cloud': {
            if (!this.getCapabilityValue('onoff') && value !== 0) {
              this.updateCapabilityValue('onoff', true, this.getStoreValue("channel"));
            } else if (this.getCapabilityValue('onoff') && value === 0) {
              this.updateCapabilityValue('onoff', false, this.getStoreValue("channel"));
            }
            const dim_cloud = value === 0 ? 1 : value * 100;
            return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', command_param: dim_component, command_value: dim_cloud, deviceid: String(this.getSetting('cloud_device_id')), channel: this.getStoreValue('channel')})]);
          }
          default:
            break;
        }

      }
    } catch (error) {
      this.error(error);
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
          /* update light_mode if available */
          if (this.hasCapability('light_mode')) {
            this.triggerCapabilityListener('light_mode', 'temperature');
          }

          /* set light_temperature depending of device model */
          if (this.getStoreValue('config').name === 'Shelly Duo') {
            const duo_white = 100 - (value * 100);
            return await this.util.sendCommand('/light/0?white='+ duo_white +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
          } else if (this.getStoreValue('config').name === 'Shelly Bulb' || this.getStoreValue('config').name === 'Shelly Bulb RGBW') {
            const light_temperature = Number(this.util.denormalize((1 - value), 3000, 6500)); // the 1 - value is a backwards compatible hack as the denormalize function has been initially wrong but people might have configured it like that in their flows
            return await this.util.sendCommand('/light/0?temp='+ light_temperature +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
          } else if (this.getStoreValue('config').name === 'Shelly RGBW2 Color') {
            const rgbw2_white = Number(this.util.denormalize((1 - value) , 0, 255)); // 1 - value is because higher white is less warm, therefor it needs to be inverted
            if (rgbw2_white > 125 && !this.getCapabilityValue('onoff.whitemode')) {
              this.updateCapabilityValue('onoff.whitemode', true);
            } else if (rgbw2_white <= 125 && this.getCapabilityValue('onoff.whitemode')) {
              this.updateCapabilityValue('onoff.whitemode', false);
            }
            return await this.util.sendCommand('/color/'+ this.getStoreValue('channel') +'?white='+ rgbw2_white, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
          }

        }
        case 'cloud': {
          const white = 100 - (value * 100);
          return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', command_param: 'white', command_value: white, deviceid: String(this.getSetting('cloud_device_id')), channel: this.getStoreValue('channel')})]);
        }
        default:
          break;
      }
    } catch (error) {
      this.error(error);
    }
  }

  /* light_hue, light_saturation */
  async onMultipleCapabilityListenerSatHue(valueObj, optsObj) {
    try {
      if (typeof valueObj.light_hue !== 'undefined') {
        var hue_value = valueObj.light_hue;
      } else {
        var hue_value = this.getCapabilityValue('light_hue');
      }
      if (typeof valueObj.light_saturation !== 'undefined') {
        var saturation_value = valueObj.light_saturation;
      } else {
        var saturation_value = this.getCapabilityValue('light_saturation');
      }
      const light_config = this.getStoreValue('config').extra.light;
      const color = tinycolor.fromRatio({ h: hue_value, s: saturation_value, v: this.getCapabilityValue('dim') });
      const rgbcolor = color.toRgb();
      switch(this.getStoreValue('communication')) {
        case 'websocket': {
          return;
        }
        case 'coap': {
          if (this.getCapabilityValue('light_mode') !== 'color') {
            await this.triggerCapabilityListener('light_mode', 'color');
          }
          return await this.util.sendCommand('/'+ light_config.light_endpoint +'/'+ this.getStoreValue('channel') +'?red='+ Number(rgbcolor.r) +'&green='+ Number(rgbcolor.g) +'&blue='+ Number(rgbcolor.b) +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        }
        case 'cloud': {
          await this.updateCapabilityValue('light_mode', 'color', this.getStoreValue("channel"));
          return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest-RGB', command: 'light', command_param: 'rbg', red: Number(rgbcolor.r), green: Number(rgbcolor.g), blue: Number(rgbcolor.b), deviceid: String(this.getSetting('cloud_device_id')), channel: this.getStoreValue('channel')})]);
        }
        default:
          break;
      }
    } catch (error) {
      this.error(error);
    }    
  }

  /* light_mode */
  async onCapabilityLightMode(value, opts) {
    try {
      switch(this.getStoreValue('communication')) {
        case 'websocket': {
          return;
        }
        case 'coap': {
          if (this.getStoreValue('config').name === 'Shelly Bulb' || this.getStoreValue('config').name === 'Shelly Bulb RGBW') {
            const light_mode = value === 'temperature' ? 'white' : 'color';
            return await this.util.sendCommand('/settings/?mode='+ light_mode +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
          }
        }
        case 'cloud': {
          return;
        }
        default:
          break;
      }


      
    } catch (error) {
      this.error(error);
    }
  }

  /* onoff.whitemode */
  async onCapabilityOnoffWhiteMode(value) {
    try {
      if (value) {
        this.updateCapabilityValue('light_mode', 'temperature', this.getStoreValue("channel"));
        return await this.util.sendCommand('/color/'+ this.getStoreValue('channel') +'?gain=0&white=255', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        this.updateCapabilityValue("light_mode", 'color', this.getStoreValue("channel"));
        return await this.util.sendCommand('/color/'+ this.getStoreValue('channel') +'?gain=100&white=0', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    } catch (error) {
      this.error(error);
    }

    
  };

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
      this.error(error);
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
      this.error(error);
    }
  }

  /* target_temperature */
  async onCapabilityTargetTemperature(value, opts) {
    try {
      switch(this.getStoreValue('communication')) {
        case 'websocket':{
          return await this.util.sendRPCCommand('/rpc/Thermostat.Set?id='+ this.getStoreValue("channel") +'&target_C='+ value, this.getSetting('address'), this.getSetting('password'));
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
      this.error(error);
    }
  }

  // MAINTENANCE LISTENERS

  /* enableBLEProxy */
  async onMaintenanceEnableBLEPRoxy() {
    try {
      const scriptID = await this.util.enableBLEProxy(this.getStoreValue('ble_script_id'), this.getSetting('address'), this.getSetting('password'));
      return await this.setStoreValue('ble_script_id', scriptID);
    } catch (error) {
      this.error(error);
    }
  }

  /* disableBLEProxy */
  async onMaintenanceDisableBLEPRoxy() {
    try {
      if (this.getStoreValue('ble_script_id')) {
        await this.util.disableBLEProxy(this.getStoreValue('ble_script_id'), this.getSetting('address'), this.getSetting('password'));
        return await this.setStoreValue('ble_script_id', 0);
      } else {
        this.error('Script not found');
      }
    } catch (error) {
      this.error(error);
    }
  }

  // HELPER FUNCTIONS

  /* updating capabilities */
  async updateCapabilityValue(capability, value, channel = 0) {
    try {

      if (this.getStoreValue('channel') === Number(channel)) { // the channel of the parsing device matches the channel of the updated capability value, we can use this
        if (this.hasCapability(capability)) {
          if (value !== this.getCapabilityValue(capability) && value !== null && value !== 'null' && value !== 'undefined' && value !== undefined) {
            await this.setCapabilityValue(capability, value);
          }
        } else {
          this.log('adding capability '+ capability +' to '+ this.getData().id +' as the device seems to have values for this capability ...');
          this.addCapability(capability);
        }
      } else { // the channel of the parsing device does not matches the channel of the updated capability value, we need to find the right device
        const device_id = this.getStoreValue('main_device') + '-channel-' + channel;
        const shellies = this.homey.app.getShellyCollection();
        const shelly = shellies.filter(shelly => shelly.id.includes(device_id));
        if (shelly.length > 0) {
          const device = shelly[0].device;
          if (device.hasCapability(capability)) {
            if (value !== device.getCapabilityValue(capability) && value !== null && value !== 'null' && value !== 'undefined' && value !== undefined) {
              await device.setCapabilityValue(capability, value);
            }
          } else {
            this.log('adding capability '+ capability +' to '+ device.getData().id +' as the device seems to have values for this capability ...');
            device.addCapability(capability);
          }
        }
      }
    } catch (error) {
      this.error('Trying to update capability', capability, 'with value', value, 'for channel', channel, 'of device', this.getData().id), 'with ip address', this.getSetting('address');
      this.error(error);
    }
  }

  /* updating capabilities */
  async triggerDeviceTriggerCard(capability, value, channel, flowcard, tokens = {}, args = {}) {
    try {
      if (this.getStoreValue('channel') === Number(channel)) { // the channel of the parsing device matches the channel of the updated capability value, we can use this
        if (value !== this.getCapabilityValue(capability) && value !== null && value !== 'null' && value !== 'undefined' && value !== undefined) {
          return await this.homey.flow.getDeviceTriggerCard(flowcard).trigger(this, tokens, args).catch(error => { this.error(error) });
        }
      } else { // the channel of the parsing device does not matches the channel of the updated capability value, we need to find the right device
        const device_id = this.getStoreValue('main_device') + '-channel-' + channel;
        const shellies = this.homey.app.getShellyCollection();
        const shelly = shellies.filter(shelly => shelly.id.includes(device_id));
        if (shelly.length > 0) {
          const device = shelly[0].device;
          if (device.hasCapability(capability)) {
            if (value !== device.getCapabilityValue(capability) && value !== null && value !== 'null' && value !== 'undefined' && value !== undefined) {
              return await this.homey.flow.getDeviceTriggerCard(flowcard).trigger(device, tokens, args).catch(error => { this.error(error) });
            }
          }
        }
      }
    } catch (error) {
      this.error(error);
    }
  }

  /* polling local COAP or WEBSOCKET devices over HTTP REST API, ONLY CALLED FOR COAP AND WEBSOCKET COMMUNICATION */
  async pollDevice() {
    try {

      let result = {};
      if (this.getStoreValue('communication') === 'websocket') {
        result = await this.util.sendRPCCommand('/rpc/Shelly.GetStatus', this.getSetting('address'), this.getSetting('password'));
        this.parseFullStatusUpdateGen2(result);
      } else {
        result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        this.parseFullStatusUpdateGen1(result);
      }

      this.pollingFailures = 0;

      /* parse multi-channel devices as well */
      if (this.getStoreValue('config') !== undefined && this.getStoreValue('config') !== null ) {
        if (this.getStoreValue('config').channels > 1) {
          for (let i = 1; i < this.getStoreValue('config').channels; i++) {
            await this.util.sleep(500);
            const device_id = this.getStoreValue('main_device') + '-channel-' + i;
            const shellies = this.homey.app.getShellyCollection();
            const shelly = shellies.filter(shelly => shelly.id.includes(device_id));
            if (shelly.length > 0) {
              const device = shelly[0].device;
              if (device) {
                if (device.getStoreValue('communication') === 'websocket') {
                  device.parseFullStatusUpdateGen2(result);
                } else {
                  device.parseFullStatusUpdateGen1(result);
                }
                device.pollingFailures = 0;
              }
            }
          }
        }
      }

    } catch (error) {
      this.error(error.message);

      /* mark as unavailable and trigger the device offline trigger card */
      if (this.getAvailable()) {
        this.setUnavailable(this.homey.__('device.unreachable') + error.message).catch(error => { this.error(error) });
        this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": this.getName(), "device_error": error.message.toString()}).catch(error => { this.error(error) });
      }

      /* handle multi-channel devices */
      if (this.getStoreValue('config') !== undefined && this.getStoreValue('config') !== null ) {
        if (this.getStoreValue('config').channels > 1) {
          for (let i = 1; i < this.getStoreValue('config').channels; i++) {
            await this.util.sleep(500);
            const device_id = this.getStoreValue('main_device') + '-channel-' + i;
            const shellies = this.homey.app.getShellyCollection();
            const shelly = shellies.filter(shelly => shelly.id.includes(device_id));
            if (shelly.length > 0) {
              const device = shelly[0].device;
              if (device) {
                if (device.getAvailable()) {
                  device.setUnavailable(device.homey.__('device.unreachable') + error.message).catch(error => { this.error(error) });
                  device.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": device.getName(), "device_error": error.message.toString()}).catch(error => { this.error(error) });
                }
              }
            }
          }
        }
      }
      
      /* stop polling on devices that are unreachable over REST after 10 failures */
      this.pollingFailures++;
      if (this.pollingFailures >= 10) {
        this.error('Killing polling for device', this.getName(), 'with IP', this.getSetting('address'), 'of type', this.getStoreValue('type'), 'due to 10 polling failures' );
        this.homey.clearInterval(this.pollingInterval);

        /* make the device available again to avoid users from complaining about the app (read Homey) not being able to access their Shelly */
        if (!this.getAvailable()) { await this.setAvailable().catch(this.error); };

        /* handle multi-channel devices */
        if (this.getStoreValue('config') !== undefined && this.getStoreValue('config') !== null ) {
          if (this.getStoreValue('config').channels > 1) {
            for (let i = 1; i < this.getStoreValue('config').channels; i++) {
              await this.util.sleep(500);
              const device_id = this.getStoreValue('main_device') + '-channel-' + i;
              const shellies = this.homey.app.getShellyCollection();
              const shelly = shellies.filter(shelly => shelly.id.includes(device_id));
              if (shelly.length > 0) {
                const device = shelly[0].device;
                if (device) {
                  if (!device.getAvailable()) { await device.setAvailable().catch(this.error); };
                }
              }
            }
          }
        }
      }
      
    }
  }

  /* generic full status parser for polling over HTTP and cloud status updates for gen1 */
  async parseFullStatusUpdateGen1(result = {}) {
    try {
      if (!this.getAvailable()) { await this.setAvailable().catch(this.error); };
      let channel = this.getStoreValue('channel') || 0;

      // RELAYS (onoff)
      if (result.hasOwnProperty("relays") && this.hasCapability('onoff')) {
        if (result.relays.hasOwnProperty([channel])) {
          this.updateCapabilityValue('onoff', result.relays[channel].ison, channel);
        }
      }

      // METERS (measure_power, meter_power)
      if (result.hasOwnProperty("meters")) {

        if (result.meters.hasOwnProperty([channel])) {
          /* measure_power */
          if (result.meters[channel].hasOwnProperty("power") && this.hasCapability('measure_power')) {
            this.updateCapabilityValue('measure_power', result.meters[channel].power, channel);
          }
          /* meter_power */
          if (result.meters[channel].hasOwnProperty("total") && this.hasCapability('meter_power')) {
            let meter_power_meter = result.meters[channel].total * 0.000017;
            this.updateCapabilityValue('meter_power', meter_power_meter, channel);
          }
        }

      }

      // EMETERS (measure_power, meter_power, meter_power.total, meter_power_returned, power_factor, measure_current, measure_voltage)
      if (result.hasOwnProperty("emeters")) {

        if (result.emeters.hasOwnProperty([channel])) {

          /* measure_power */
          if (result.emeters[channel].hasOwnProperty("power") && this.hasCapability('measure_power')) {
            this.updateCapabilityValue('measure_power', result.emeters[channel].power, channel);
          }

          /* meter_power */
          if (result.emeters[channel].hasOwnProperty("total") && this.hasCapability('meter_power')) {
            let meter_power_emeter = result.emeters[channel].total / 1000;
            this.updateCapabilityValue('meter_power', meter_power_emeter, channel);
          }

          /* meter_power.total */
          if (result.emeters.hasOwnProperty("total_power") && this.hasCapability('meter_power.total')) {
            if (this.getCapabilityValue('meter_power.total') !== result.emeters.total_power) {
              this.homey.flow.getDeviceTriggerCard('triggerMeterPowerTotal').trigger(this, {'energy': result.emeters.total_power}, {}).catch(error => { this.error(error) });
            }
            this.updateCapabilityValue('meter_power.total', result.emeters.total_power, channel);
          }

          /* meter_power_returned */
          if (result.emeters[channel].hasOwnProperty("total_returned") && this.hasCapability('meter_power_returned')) {
            let meter_power_returned = result.emeters[channel].total_returned / 1000;
            let meter_power_returned_rounded = Number(meter_power_returned.toFixed(3));
            if (this.getCapabilityValue('meter_power_returned') !== meter_power_returned_rounded) {
              this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned').trigger(this, {'energy': meter_power_returned_rounded}, {}).catch(error => { this.error(error) });
            }
            this.updateCapabilityValue('meter_power_returned', meter_power_returned_rounded, channel);
          }

          /* power factor */
          if (result.emeters[channel].hasOwnProperty("pf") && this.hasCapability('meter_power_factor')) {
            this.updateCapabilityValue('meter_power_factor', result.emeters[channel].pf, channel);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerFactor').trigger(this, {'pf': result.emeters[channel].pf}, {}).catch(error => { this.error(error) });
          }

          /* measure_current */
          if (result.emeters[channel].hasOwnProperty("current") && this.hasCapability('measure_current')) {
            this.updateCapabilityValue('measure_current', result.emeters[channel].current, channel);
          }

          /* measure_voltage */
          if (result.emeters[channel].hasOwnProperty("voltage") && this.hasCapability('measure_voltage')) {
            this.updateCapabilityValue('measure_voltage', result.emeters[channel].voltage, channel);
          }

        }

      }

      // TOTAL_POWER (measure_power.total)
      if (result.hasOwnProperty("total_power") && this.hasCapability('measure_power.total')) {
        if (this.getCapabilityValue('measure_power.total') !== result.total_power) {
          this.updateCapabilityValue('measure_power.total', result.total_power, channel);
          this.homey.flow.getDeviceTriggerCard('triggerMeasurePowerTotal').trigger(this, {'power': result.total_power}, {}).catch(error => { this.error(error) });
        }
      }

      // BAT (measure_battery, measure_voltage)
      if (result.hasOwnProperty("bat")) {

        /* measure_battery */
        if (result.bat.hasOwnProperty("value") && this.hasCapability('measure_battery')) {
          const measure_battery = this.util.clamp(result.bat.value, 0, 100);
          this.updateCapabilityValue('measure_battery', measure_battery, channel);
        }

        /* measure_voltage */
        if (result.bat.hasOwnProperty("voltage") && this.hasCapability('measure_voltage')) {
          this.updateCapabilityValue('measure_voltage', result.bat.voltage, channel);
        }

      }

      // TMP (measure_temperature)
      if (result.hasOwnProperty("tmp")) {

        /* measure_temperature */
        if (result.tmp.hasOwnProperty("value") && this.hasCapability('measure_temperature')) {
          this.updateCapabilityValue('measure_temperature', result.tmp.value, channel);
        }

        /* measure_temperature */
        if (result.tmp.hasOwnProperty("tC") && this.hasCapability('measure_temperature')) {
          this.updateCapabilityValue('measure_temperature', result.tmp.tC, channel);
        }

      }

      // TEMPERATURE (measure_temperature)
      if (result.hasOwnProperty("temperature") && this.hasCapability('measure_temperature')) {

        /* measure_temperature */
        this.updateCapabilityValue('measure_temperature', result.temperature, channel);

      }

      // THERMOSTATS (target_temperature, measure_temperature)
      if (result.hasOwnProperty("thermostats") && this.hasCapability('measure_temperature')) {

        /* valve_position */
        if (result.thermostats[channel].hasOwnProperty("pos") && this.hasCapability('valve_position')) {
          if (result.thermostats[channel].pos != this.getCapabilityValue('valve_position')) {
            const valve_position = this.util.clamp(result.thermostats[channel].pos, 0, 100);
            this.updateCapabilityValue('valve_position', valve_position, channel);
            this.homey.flow.getDeviceTriggerCard('triggerValvePosition').trigger(this, {'position': valve_position}, {}).catch(error => { this.error(error) });
          }
        }

        /* valve_mode */
        if (result.thermostats[channel].hasOwnProperty("schedule") && result.thermostats[channel].hasOwnProperty("schedule_profile") && this.hasCapability('valve_mode')) {
          if (!result.thermostats[channel].schedule && this.getCapabilityValue('valve_position') !== "0") {
            this.updateCapabilityValue('valve_mode', "0", channel);
          } else if (result.thermostats[channel].schedule && (result.thermostats[channel].schedule_profile.toString() !== this.getCapabilityValue('valve_mode'))) {
            this.updateCapabilityValue('valve_mode', result.thermostats[channel].schedule_profile.toString(), channel);
          }
        }

        /* target_temperature */
        if (result.thermostats[channel].hasOwnProperty("target_t") && this.hasCapability('measure_temperature')) {
          const target_temperature = this.util.clamp(result.thermostats[channel].target_t.value, 5, 30);
          this.updateCapabilityValue('target_temperature', target_temperature, channel);
        }

        /* measure_temperature */
        if (result.thermostats[channel].hasOwnProperty("tmp") && this.hasCapability('measure_temperature')) {
          this.updateCapabilityValue('measure_temperature', result.thermostats[channel].tmp.value, channel);
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
          const windowcoverings_set = this.util.clamp(result.rollers[channel].current_pos, 0, 100) / 100;
          if (windowcoverings_set !== this.getCapabilityValue('windowcoverings_set')) {
            await this.setStoreValue('previous_position', this.getCapabilityValue('windowcoverings_set'));
            this.updateCapabilityValue('windowcoverings_set', windowcoverings_set, channel);
          }
        }

      }

      // LIGHTS
      if (result.hasOwnProperty("lights")) {

        if (result.lights.hasOwnProperty([channel])) {

          /* onoff */
          if (result.lights[channel].hasOwnProperty("ison") && this.hasCapability('onoff')) {
            this.updateCapabilityValue('onoff', result.lights[channel].ison, channel);
          }

          /* light_mode */
          if (result.lights[channel].hasOwnProperty("mode") && this.hasCapability('light_mode')) {
            var light_mode = result.lights[channel].mode === 'white' ? 'temperature' : 'color';
            if (light_mode != this.getCapabilityValue('light_mode') && this.getStoreValue('type') !== 'SHRGBW2') {
              this.updateCapabilityValue('light_mode', light_mode, channel);
            }
          } else {
            var light_mode = 'temperature';
          }

          // Shelly DUO
          if (this.getStoreValue('type') === 'SHBDUO-1') {

            /* dim */
            let dim_duo = result.lights[channel].brightness > 100 ? 1 : result.lights[channel].brightness / 100;
            this.updateCapabilityValue('dim', dim_duo, channel);

            /* light_temperature */
            let light_temperature_duo = 1 - (result.lights[channel].white / 100);
            this.updateCapabilityValue('light_temperature', this.util.clamp(light_temperature_duo, 0, 1), channel);

          }

          // Shelly Bulb (RGB)
          if (this.getStoreValue('type') === 'SHBLB-1' || this.getStoreValue('type') === 'SHCB-1') {

            /* dim */
            if (light_mode === 'color') {
              var dim_bulb = result.lights[channel].gain > 100 ? 1 : result.lights[channel].gain / 100;
            } else {
              var dim_bulb = result.lights[channel].brightness > 100 ? 1 : result.lights[channel].brightness / 100;
            }
            this.updateCapabilityValue('dim', dim_bulb, channel);

            /* light_temperature_temp */
            let light_temperature_bulb = 1 - Number(this.util.normalize(result.lights[channel].temp, 3000, 6500));
            this.updateCapabilityValue('light_temperature', this.util.clamp(light_temperature_bulb, 0, 1), channel);

          }

          // Shelly RGBW2
          if (this.getStoreValue('type') === 'SHRGBW2') {

            /* dim and light_temperature in color mode */
            if (result.lights[channel].mode === 'color') {
              let dim_rgbw2color = result.lights[channel].gain > 100 ? 1 : result.lights[channel].gain / 100;
              this.updateCapabilityValue('dim', dim_rgbw2color, channel);

              let light_temperature_rgbw2 = 1 - Number(this.util.normalize(result.lights[channel].white, 0, 255));
              this.updateCapabilityValue('light_temperature', this.util.clamp(light_temperature_rgbw2, 0, 1), channel);

              if (result.lights[channel].white > 125 && !this.getCapabilityValue('onoff.whitemode')) {
                this.updateCapabilityValue('onoff.whitemode', true, channel);
              } else if (result.lights[channel].white <= 125 && this.getCapabilityValue('onoff.whitemode')) {
                this.updateCapabilityValue('onoff.whitemode', false, channel);
              }
            }

            /* dim white mode */
            if (result.lights[channel].mode === 'white') {
              let dim_rgbwwhite = result.lights[channel].brightness > 100 ? 1 : result.lights[channel].brightness / 100;
              this.updateCapabilityValue('dim', dim_rgbwwhite, channel);
            }

          }

          /* light_hue & light_saturation */
          if (light_mode === 'color') {
            await this.setStoreValue('red', result.lights[channel].red);
            await this.setStoreValue('green', result.lights[channel].green);
            await this.setStoreValue('blue', result.lights[channel].blue);

            let color = tinycolor({r: result.lights[channel].red, g: result.lights[channel].green, b: result.lights[channel].blue});
            let hsv = color.toHsv();
            let light_hue = Number((hsv.h / 360).toFixed(2));

            // capability light_hue
            this.updateCapabilityValue('light_hue', light_hue, channel);

            // capability light_saturation
            this.updateCapabilityValue('light_saturation', hsv.s, channel);

          }

        }

      }

      // SENSOR (alarm_motion, alarm_tamper, alarm_contact)
      if (result.hasOwnProperty("sensor")) {

        /* alarm_motion */
        if (result.sensor.hasOwnProperty("motion") && this.hasCapability('alarm_motion')) {
          this.updateCapabilityValue('alarm_motion', result.sensor.motion, channel);
        }

        /* alarm_tamper */
        if (result.sensor.hasOwnProperty("vibration") && this.hasCapability('alarm_tamper')) {
          this.updateCapabilityValue('alarm_tamper', result.sensor.vibration, channel);
        }

        /* alarm_contact */
        if (result.sensor.hasOwnProperty("state") && this.hasCapability('alarm_contact')) {
          let alarm_contact = result.sensor.state === 'open' ? true : false;
          this.updateCapabilityValue('alarm_contact', alarm_contact, channel);
        }

      }

      // LUX (measure_luminance)
      if (result.hasOwnProperty("lux") && this.hasCapability('measure_luminance')) {
        if (result.lux.hasOwnProperty("value")) {
          this.updateCapabilityValue('measure_luminance', result.lux.value, channel);
        }
      }

      // ACCEL (alarm_tamper, tilt)
      if (result.hasOwnProperty("accel")) {

        /* alarm_tamper */
        if (result.accel.hasOwnProperty("vibration") && this.hasCapability('alarm_tamper')) {
          let alarm_tamper_accel = result.accel.vibration === 1 ? true : false;
          this.updateCapabilityValue('alarm_tamper', alarm_tamper_accel, channel);
        }

        /* tilt */
        if (result.accel.hasOwnProperty("tilt") && this.hasCapability('tilt')) {
          if(!isNaN(result.accel.tilt)) {
            this.updateCapabilityValue('tilt', result.accel.tilt, channel);
          }
        }

      }

      // FLOOD (alarm_water)
      if (result.hasOwnProperty("flood") && this.hasCapability('alarm_water')) {
        this.updateCapabilityValue('alarm_water', result.flood, channel);
      }

      // GAS (alarm_smoke, gas_concentration)
      if (result.hasOwnProperty("gas_sensor") && this.hasCapability('alarm_smoke') && this.hasCapability('gas_concentration')) {

        /* alarm_smoke */
        if (result.gas_sensor.alarm_state == 'mild' || result.gas_sensor.alarm_state == 'heavy') {
          var alarm_gas = true;
        } else {
          var alarm_gas = false;
        }
        this.updateCapabilityValue('alarm_smoke', alarm_gas, channel);

        /* concentration */
        this.updateCapabilityValue('gas_concentration', Number(result.concentration.ppm), channel);

      }

      // SMOKE (alarm_smoke)
      if (result.hasOwnProperty("smoke") && this.hasCapability('alarm_smoke')) {
        this.updateCapabilityValue('alarm_smoke', result.smoke, channel);
      }

      // HUM (measure_humidity)
      if (result.hasOwnProperty("hum") && this.hasCapability('measure_humidity')) {
        if (result.hum.hasOwnProperty("value")) {
          this.updateCapabilityValue('measure_humidity', result.hum.value, channel);
        }
      }

      // ADCS (measure_voltage)
      if (result.hasOwnProperty("adcs") && this.hasCapability('measure_voltage') && this.getStoreValue('channel') === 0) {
        if (result.adcs.hasOwnProperty([0])) {
          if (result.adcs[0].hasOwnProperty("voltage")) {
            this.updateCapabilityValue('measure_voltage', result.adcs[0].voltage, channel);
          }
        }
      }

      // INPUTS (input_1, input_2, input_3, input_4)
      if (result.hasOwnProperty("inputs")) {

        /* input_1 */
        if (result.inputs.hasOwnProperty([0]) && this.getStoreValue('channel') === 0 && (this.hasCapability('input_1') || this.getStoreValue('type').includes('SHBTN-2'))) {

          if (this.hasCapability('input_1')) {
            let input_1 = result.inputs[0].input == 1 ? true : false;
            const input1Triggercard = input_1 ? 'triggerInput1On' : 'triggerInput1Off';
            this.triggerDeviceTriggerCard('input_1', input_1, 0, input1Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_1', input_1, 0, 'triggerInput1Changed', {}, {});
            this.updateCapabilityValue('input_1', input_1, channel);
          }

          // action event for gen1 cloud devices
          if (this.getStoreValue('communication') === 'cloud' && this.getStoreValue('event_cnt') !== null && result.inputs[0].event_cnt > 0 && result.inputs[0].event_cnt > this.getStoreValue('event_cnt') && result.inputs[0].event) {
            if (this.hasCapability('input_1') && this.hasCapability('input_2')) {
              var action0 = this.util.getActionEventDescription(result.inputs[0].event, 'cloud', 'gen1') + '_1';
            } else {
              var action0 = this.util.getActionEventDescription(result.inputs[0].event, 'cloud', 'gen1');
            }
            await this.setStoreValue('event_cnt', result.inputs[0].event_cnt);
            this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action0}, {"action": action0}).catch(error => { this.error(error) });

            // TODO: remove this eventually
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action0 }, {"id": this.getData().id, "device": this.getName(), "action": action0 }).catch(error => { this.error(error) });
          } else if (this.getStoreValue('event_cnt') === null) {
            await this.setStoreValue('event_cnt', result.inputs[0].event_cnt);
          }
        }

        /* input_2 */
        if (result.inputs.hasOwnProperty([1]) && this.hasCapability('input_2')) {
          let input_2 = result.inputs[1].input == 1 ? true : false;
          const input2Triggercard = input_2 ? 'triggerInput2On' : 'triggerInput2Off';
          this.triggerDeviceTriggerCard('input_2', input_2, 0, input2Triggercard, {}, {});
          this.triggerDeviceTriggerCard('input_2', input_2, 0, 'triggerInput2Changed', {}, {});
          this.updateCapabilityValue('input_2', input_2, channel);

          // action events for gen1 cloud devices
          if (this.getStoreValue('communication') === 'cloud' && this.getStoreValue('event_cnt') !== null && result.inputs[1].event_cnt > 0 && result.inputs[1].event_cnt > this.getStoreValue('event_cnt') && result.inputs[1].event) {
            var action1 = this.util.getActionEventDescription(result.inputs[1].event, 'cloud', 'gen1') + '_2';
            await this.setStoreValue('event_cnt', result.inputs[1].event_cnt);
            this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action1}, {"action": action1}).catch(error => { this.error(error) });

            // TODO: remove this eventually
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action1 }, {"id": this.getData().id, "device": this.getName(), "action": action1 }).catch(error => { this.error(error) });
          } else if (this.getStoreValue('event_cnt') === null) {
            this.setStoreValue('event_cnt', result.inputs[1].event_cnt);
          }
        } else if (result.inputs.hasOwnProperty([1]) && this.hasCapability('input_1') && this.getStoreValue('channel') === 1) {
            let input_2_1 = result.inputs[1].input == 1 ? true : false;
            const input2_1Triggercard = input_2_1 ? 'triggerInput1On' : 'triggerInput1Off';
            this.triggerDeviceTriggerCard('input_1', input_2_1, 1, input2_1Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_1', input_2_1, 1, 'triggerInput1Changed', {}, {});
            this.updateCapabilityValue('input_1', input_2_1, channel);

          // action events for gen1 cloud devices
          if (this.getStoreValue('communication') === 'cloud' && this.getStoreValue('event_cnt') !== null && result.inputs[1].event_cnt > 0 && result.inputs[1].event_cnt > this.getStoreValue('event_cnt') && result.inputs[1].event) {
            var action1 = this.util.getActionEventDescription(result.inputs[1].event, 'cloud', 'gen1');
            await this.setStoreValue('event_cnt', result.inputs[1].event_cnt);
            this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action1}, {"action": action1}).catch(error => { this.error(error) });

            // TODO: remove this eventually
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action1 }, {"id": this.getData().id, "device": this.getName(), "action": action1 }).catch(error => { this.error(error) });
          } else if (this.getStoreValue('event_cnt') === null) {
            await this.setStoreValue('event_cnt', result.inputs[0].event_cnt);
          }
        }

        /* input_3 */
        if (result.inputs.hasOwnProperty([2]) && this.hasCapability('input_3')) {
          let input_3 = result.inputs[2].input == 1 ? true : false;
          const input3Triggercard = input_3 ? 'triggerInput3On' : 'triggerInput3Off';
          this.triggerDeviceTriggerCard('input_3', input_3, 2, input3Triggercard, {}, {});
          this.triggerDeviceTriggerCard('input_3', input_3, 2, 'triggerInput3Changed', {}, {});
          this.updateCapabilityValue('input_3', input_3, channel);

          // input/action events for cloud devices
          if (this.getStoreValue('communication') === 'cloud' && this.getStoreValue('event_cnt') !== null && result.inputs[2].event_cnt > 0 && result.inputs[2].event_cnt > this.getStoreValue('event_cnt') && result.inputs[2].event) {
            const action2 = this.util.getActionEventDescription(result.inputs[2].event, 'cloud', 'gen1') + '_3';
            this.setStoreValue('event_cnt', result.inputs[2].event_cnt);
            this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action2}, {"action": action2}).catch(error => { this.error(error) });

            // TODO: remove this eventually
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action2 }, {"id": this.getData().id, "device": this.getName(), "action": action2 }).catch(error => { this.error(error) });
          } else if (this.getStoreValue('event_cnt') === null) {
            this.setStoreValue('event_cnt', result.inputs[2].event_cnt);
          }
        }

        /* input_4 */
        if (result.inputs.hasOwnProperty([3]) && this.hasCapability('input_4')) {
          let input_4 = result.inputs[3].input == 1 ? true : false;
          const input4Triggercard = input_4 ? 'triggerInput4On' : 'triggerInput4Off';
          this.triggerDeviceTriggerCard('input_4', input_4, 3, input4Triggercard, {}, {});
          this.triggerDeviceTriggerCard('input_4', input_4, 3, 'triggerInput4Changed', {}, {});
          this.updateCapabilityValue('input_4', input_4, channel);

          // input/action events for cloud devices
          if (this.getStoreValue('communication') === 'cloud' && this.getStoreValue('event_cnt') !== null && result.inputs[3].event_cnt > 0 && result.inputs[3].event_cnt > this.getStoreValue('event_cnt') && result.inputs[3].event) {
            const action3 = this.util.getActionEventDescription(result.inputs[3].event, 'cloud', 'gen1') + '_4';
            await this.setStoreValue('event_cnt', result.inputs[3].event_cnt);
            this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action3}, {"action": action3}).catch(error => { this.error(error) });

            // TODO: remove this eventually
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action3 }, {"id": this.getData().id, "device": this.getName(), "action": action3 }).catch(error => { this.error(error) });
          } else if (this.getStoreValue('event_cnt') === null) {
            await this.setStoreValue('event_cnt', result.inputs[3].event_cnt);
          }
        }

      }

      // EXT_TEMPERATURE (measure_temperature.1, measure_temperature.2, measure_temperature.3)
      if (result.hasOwnProperty("ext_temperature") && this.getStoreValue('channel') === 0) {

        /* measure_temperature.1 */
        if (result.ext_temperature.hasOwnProperty([0]) && !this.hasCapability('measure_temperature.1')) {
          this.addCapability('measure_temperature.1');
        } else if (result.ext_temperature.hasOwnProperty([0]) && this.hasCapability('measure_temperature.1')) {
          let temp1 = result.ext_temperature[0].tC;
          if (typeof temp1 == 'number' && temp1 != this.getCapabilityValue('measure_temperature.1')) {
            this.updateCapabilityValue('measure_temperature.1', temp1, 0);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature1').trigger(this, {'temperature': temp1}, {}).catch(error => { this.error(error) });
          }
        }

        /* measure_temperature.2 */
        if (result.ext_temperature.hasOwnProperty([1]) && !this.hasCapability('measure_temperature.2')) {
          this.addCapability('measure_temperature.2');
        } else if (result.ext_temperature.hasOwnProperty([1]) && this.hasCapability('measure_temperature.2')) {
          let temp2 = result.ext_temperature[1].tC;
          if (typeof temp2 == 'number' && temp2 != this.getCapabilityValue('measure_temperature.2')) {
            this.updateCapabilityValue('measure_temperature.2', temp2, 0);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature2').trigger(this, {'temperature': temp2}, {}).catch(error => { this.error(error) });
          }
        }

        /* measure_temperature.3 */
        if (result.ext_temperature.hasOwnProperty([2]) && !this.hasCapability('measure_temperature.3')) {
          this.addCapability('measure_temperature.3');
        } else if (result.ext_temperature.hasOwnProperty([2]) && this.hasCapability('measure_temperature.3')) {
          let temp3 = result.ext_temperature[2].tC;
          if (typeof temp3 == 'number' && temp3 != this.getCapabilityValue('measure_temperature.3')) {
            this.updateCapabilityValue('measure_temperature.3', temp3, 0);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature3').trigger(this, {'temperature': temp3}, {}).catch(error => { this.error(error) });
          }
        }

      }

      // EXT_SWITCH (input_external)
      if (result.hasOwnProperty("ext_switch")) {
        if (result.ext_switch.hasOwnProperty([0]) && !this.hasCapability('input_external')) {
          this.addCapability('input_external');
        } else if (result.ext_switch.hasOwnProperty([0]) && this.hasCapability('input_external')) {
          let input_external = result.ext_switch[0].input === 0 ? false : true;
          if (input_external != this.getCapabilityValue('input_external')) {
            this.updateCapabilityValue('input_external', input_external, channel);
            if (input_external) {
              this.homey.flow.getDeviceTriggerCard('triggerInputExternal1On').trigger(this, {}, {}).catch(error => { this.error(error) });
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInputExternal1Off').trigger(this, {}, {}).catch(error => { this.error(error) });
            }
          }
        }
      }

      // EXT_HUMIDITY (measure_humidity)
      if (result.hasOwnProperty("ext_humidity")) {
        if (result.ext_humidity.hasOwnProperty([0]) && !this.hasCapability('measure_humidity')) {
          this.addCapability('measure_humidity');
        } else if (result.ext_humidity.hasOwnProperty([0]) && this.hasCapability('measure_humidity')) {
          this.updateCapabilityValue('measure_humidity', result.ext_humidity[0].hum, channel);
        }
      }

      // RSSI (rssi)
      if (result.hasOwnProperty("wifi_sta")) {
        if (result.wifi_sta.hasOwnProperty("rssi") && this.hasCapability("rssi")) {
          this.updateCapabilityValue('rssi', result.wifi_sta.rssi, channel);
        }
      }

      // firmware update available?
      if (result.hasOwnProperty("update")) {
        if (result.update.has_update === true && (this.getStoreValue('latest_firmware') !== result.update.new_version)) {
          this.homey.flow.getTriggerCard('triggerFWUpdate').trigger({"id": this.getData().id, "device": this.getName(), "firmware": result.update.new_version}).catch(error => { this.error(error) });
          await this.setStoreValue("latest_firmware", result.update.new_version);
        }
      }

    } catch (error) {
      this.error(error);
    }
  }

  /* generic full status updates parser for polling over HTTP, inbound websocket full status updates and cloud full status updates for gen2 */
  async parseFullStatusUpdateGen2(result = {}) {
    try {
      if (!this.getAvailable()) { await this.setAvailable().catch(this.error); }
      let channel = this.getStoreValue('channel') || 0;

      // SWITCH COMPONENT
      if (result.hasOwnProperty("switch:"+ channel) && this.getClass() !== 'thermostat') {

        /* onoff */
        if (result["switch:"+channel].hasOwnProperty("output")) {
          this.updateCapabilityValue('onoff', result["switch:"+channel].output, channel);
        }

        /* temperature (component) */
        if (result["switch:"+channel].hasOwnProperty("temperature")) {
          if (result["switch:"+channel].temperature.hasOwnProperty("tC")) {
            this.updateCapabilityValue('measure_temperature', result["switch:"+channel].temperature.tC, channel);
          }
        }

      }

      // COVER / ROLLERSHUTTER COMPONENT
      if (result.hasOwnProperty("cover:"+ channel)) {

        /* windowcoverings_state */
        if (result["cover:"+channel].hasOwnProperty("state") && this.hasCapability('windowcoverings_state')) {
          this.rollerState(result["cover:"+channel].state);
        }

        /* windowcoverings_set */
        if (result["cover:"+channel].hasOwnProperty("current_pos") && this.hasCapability('windowcoverings_set')) {
          const windowcoverings_set = this.util.clamp(result["cover:"+channel].current_pos, 0, 100) / 100;
          this.updateCapabilityValue('windowcoverings_set', windowcoverings_set, channel);
        }

        /* temperature (component) */
        if (result["cover:"+channel].hasOwnProperty("temperature")) {
          if (result["cover:"+channel].temperature.hasOwnProperty("tC")) {
            this.updateCapabilityValue('measure_temperature', result["cover:"+channel].temperature.tC, channel);
          }
        }

      }

      // LIGHT COMPONENT
      if (result.hasOwnProperty("light:"+ channel)) {

        /* onoff */
        if (result["light:"+channel].hasOwnProperty("output")) {
          this.updateCapabilityValue('onoff', result["light:"+channel].output, channel);
        }

        /* dim */
        if (result["light:"+channel].hasOwnProperty("brightness")) {
          let brightness = result["light:"+channel].brightness / 100;
          this.updateCapabilityValue('dim', brightness, channel);
        }

        /* temperature (light component) */
        if (result["light:"+channel].hasOwnProperty("temperature")) {
          if (result["light:"+channel].temperature.hasOwnProperty("tC")) {
            this.updateCapabilityValue('measure_temperature', result["light:"+channel].temperature.tC, channel);
          }
        }

        /* measure_power */
        if (result["light:"+channel].hasOwnProperty("apower")) {
          this.updateCapabilityValue('measure_power', result["light:"+channel].apower, channel);
        }

        /* meter_power */
        if (result["light:"+channel].hasOwnProperty("aenergy")) {
          if (result["light:"+channel].aenergy.hasOwnProperty("total")) {
            let meter_power = result["light:"+channel].aenergy.total / 1000;
            this.updateCapabilityValue('meter_power', meter_power, channel);
          }
        }

        /* measure_voltage */
        if (result["light:"+channel].hasOwnProperty("voltage")) {
          this.updateCapabilityValue('measure_voltage', result["light:"+channel].voltage, channel);
        }

        /* measure_current */
        if (result["light:"+channel].hasOwnProperty("current")) {
          this.updateCapabilityValue('measure_current', result["light:"+channel].current, channel);
        }

        /* measure_temperature (device temperature) */
        if (result["light:"+channel].hasOwnProperty("temperature")) {
          this.updateCapabilityValue('measure_temperature', result["light:"+channel].temperature.tC, 0);
        }

      }

      // WINDOW COMPONENT
      if (result.hasOwnProperty("window:"+ channel)) {

        /* alarm_contact */
        if (result["window:"+channel].hasOwnProperty("open")) {
          this.updateCapabilityValue('alarm_contact', result["window:"+channel].open, channel);
        }

      }

      // LUX COMPONENT
      if (result.hasOwnProperty("lux:"+ channel)) {

        /* measure_luminance */
        if (result["lux:"+channel].hasOwnProperty("lux")) {
          this.updateCapabilityValue('measure_luminance', result["lux:"+channel].lux, channel);
        }

      }

      // ILLUMINANCE COMPONENT
      if (result.hasOwnProperty("illuminance:"+ channel)) {

        /* measure_luminance */
        if (result["illuminance:"+channel].hasOwnProperty("lux")) {
          this.updateCapabilityValue('measure_luminance', result["illuminance:"+channel].lux, channel);
        }

      }

      // ROTATION COMPONENT
      if (result.hasOwnProperty("rot:"+ channel)) {

        /* tilt */
        if (result["rot:"+channel].hasOwnProperty("rot")) {
          this.updateCapabilityValue('tilt', result["rot:"+channel].rot, channel);
        }

      }

      // THERMOSTAT COMPONENT
      if (result.hasOwnProperty("thermostat:"+ channel)) {

        /* target_temperature */
        if (result["thermostat:"+channel].hasOwnProperty("target_C")) {
          this.updateCapabilityValue('target_temperature', result["thermostat:"+channel].target_C, channel);
        }

        /* measure_temperature */
        if (result["thermostat:"+channel].hasOwnProperty("current_C")) {
          this.updateCapabilityValue('measure_temperature.thermostat', result["thermostat:"+channel].current_C, channel);
        }

      }

      // MEASURE POWER, METER POWER AND TEMPERATURE FOR SWITCH, COVER AND LIGHT COMPONENT
      if (result.hasOwnProperty("switch:"+ channel) || result.hasOwnProperty("cover:"+ channel) ) {

        let component = result.hasOwnProperty("switch:"+ channel) ? result["switch:"+ channel] : result["cover:"+ channel];

        /* measure_power */
        if (component.hasOwnProperty("apower")) {
          this.updateCapabilityValue('measure_power', component.apower, channel);
        }

        /* meter_power */
        if (component.hasOwnProperty("aenergy")) {
          if (component.aenergy.hasOwnProperty("total")) {
            let meter_power = component.aenergy.total / 1000;
            this.updateCapabilityValue('meter_power', meter_power, channel);
          }
        }

        /* meter_power.returned */
        if (component.hasOwnProperty("ret_aenergy")) {
          if (component.ret_aenergy.hasOwnProperty("total")) {
            let meter_power_returned = component.ret_aenergy.total / 1000;
            this.updateCapabilityValue('meter_power.returned', meter_power_returned, channel);
          }
        }

        /* measure_voltage */
        if (component.hasOwnProperty("voltage")) {
          this.updateCapabilityValue('measure_voltage', component.voltage, channel);
        }

        /* measure_current */
        if (component.hasOwnProperty("current")) {
          this.updateCapabilityValue('measure_current', component.current, channel);
        }

        /* measure_temperature (device temperature) */
        if (component.hasOwnProperty("temperature")) {
          this.updateCapabilityValue('measure_temperature', component.temperature.tC, 0);
        }

      }

      // PLUS PM MEASURE POWER, METER POWER
      if (result.hasOwnProperty("pm1:"+ channel)) {

        /* measure_power */
        if (result["pm1:"+channel].hasOwnProperty("apower")) {
          this.updateCapabilityValue('measure_power', result["pm1:"+channel].apower, channel);
        }

        /* meter_power */
        if (result["pm1:"+channel].hasOwnProperty("aenergy")) {
          if (result["pm1:"+channel].aenergy.hasOwnProperty("total")) {
            let meter_power = result["pm1:"+channel].aenergy.total / 1000;
            this.updateCapabilityValue('meter_power', meter_power, channel);
          }
        }

        /* meter_power.total_returned */
        if (result["pm1:"+channel].hasOwnProperty("ret_aenergy")) {
          if (result["pm1:"+channel].ret_aenergy.hasOwnProperty("total")) {
            let meter_power_returned = result["pm1:"+channel].ret_aenergy.total / 1000;
            this.updateCapabilityValue('meter_power.returned', meter_power_returned, channel);
          }
        }

        /* measure_voltage */
        if (result["pm1:"+channel].hasOwnProperty("voltage")) {
          this.updateCapabilityValue('measure_voltage', result["pm1:"+channel].voltage, channel);
        }

        /* measure_current */
        if (result["pm1:"+channel].hasOwnProperty("current")) {
          this.updateCapabilityValue('measure_current', result["pm1:"+channel].current, channel);
        }

      }

      // PRO EM instantaneous power readings
      if (result.hasOwnProperty("em:0")) {

        if (this.getStoreValue('channel') === 0) {

          /* measure_power */
          this.updateCapabilityValue('measure_power', result["em:0"].a_act_power, 0);

          /* measure_power.total */
          if (this.getCapabilityValue('measure_power.total') !== result["em:0"].total_act_power) {
            this.updateCapabilityValue('measure_power.total', result["em:0"].total_act_power, 0);
            this.homey.flow.getDeviceTriggerCard('triggerMeasurePowerTotal').trigger(this, {'power': result["em:0"].total_act_power}, {}).catch(error => { this.error(error) });
          }

          /* meter_power_factor */
          this.parseCapabilityUpdate('meter_power_factor', result["em:0"].a_pf, 0);

          /* measure_current */
          this.updateCapabilityValue('measure_current', result["em:0"].a_current, 0);

          /* measure_current.total */
          this.updateCapabilityValue('measure_current', result["em:0"].total_current, 0);

          /* measure_voltage */
          this.updateCapabilityValue('measure_voltage', result["em:0"].a_voltage, 0);

        } else if (this.getStoreValue('channel') === 1) {

          /* measure_power */
          this.updateCapabilityValue('measure_power', result["em:0"].b_act_power, 1);

          /* meter_power_factor */
          this.parseCapabilityUpdate('meter_power_factor', result["em:0"].b_pf, 1);

          /* measure_current */
          this.updateCapabilityValue('measure_current', result["em:0"].b_current,1);

          /* measure_voltage */
          this.updateCapabilityValue('measure_voltage', result["em:0"].b_voltage, 1);

        } else if (this.getStoreValue('channel') === 2) {

          /* measure_power */
          this.updateCapabilityValue('measure_power', result["em:0"].c_act_power, 2);

          /* meter_power_factor */
          this.parseCapabilityUpdate('meter_power_factor', result["em:0"].c_pf, 2);

          /* measure_current */
          this.updateCapabilityValue('measure_current', result["em:0"].c_current, 2);

          /* measure_voltage */
          this.updateCapabilityValue('measure_voltage', result["em:0"].c_voltage, 2);

        }

      }

      // PRO EMDATA total energy readings
      if (result.hasOwnProperty("emdata:0")) {

        if (this.getStoreValue('channel') === 0) {
          
          /* meter_power */
          this.updateCapabilityValue('meter_power', result["emdata:0"].a_total_act_energy / 1000, 0);

          /* meter_power.returned */
          const a_total_act_ret_energy = result["emdata:0"].a_total_act_ret_energy / 1000;
          if (this.getCapabilityValue('meter_power.returned') !== a_total_act_ret_energy) {
            this.updateCapabilityValue('meter_power.returned', a_total_act_ret_energy, 0);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned').trigger(this, {'energy': a_total_act_ret_energy}, {}).catch(error => { this.error(error) });
          }

          /* meter_power.total */
          const meter_power_total = result["emdata:0"].total_act / 1000;
          if (this.getCapabilityValue('meter_power.total') !== meter_power_total) {
            this.updateCapabilityValue('meter_power.total', meter_power_total, 0);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerTotal').trigger(this, {'energy': meter_power_total}, {}).catch(error => { this.error(error) });
          }

          /* meter_power.total_returned */
          const meter_power_total_returned = result["emdata:0"].total_act_ret / 1000;
          if (this.getCapabilityValue('meter_power.total_returned') !== meter_power_total_returned) {
            this.updateCapabilityValue('meter_power.total_returned', meter_power_total_returned, 0);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturnedTotal').trigger(this, {'energy': meter_power_total_returned}, {}).catch(error => { this.error(error) });
          }

        } else if (this.getStoreValue('channel') === 1) {

          /* meter_power */
          this.updateCapabilityValue('meter_power', result["emdata:0"].b_total_act_energy / 1000, 1);

          /* meter_power.returned */
          const b_total_act_ret_energy = result["emdata:0"].b_total_act_ret_energy / 1000;
          if (this.getCapabilityValue('meter_power.returned') !== b_total_act_ret_energy) {
            this.updateCapabilityValue('meter_power.returned', b_total_act_ret_energy, 1);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned').trigger(this, {'energy': b_total_act_ret_energy}, {}).catch(error => { this.error(error) });
          }

        } else if (this.getStoreValue('channel') === 2) {

          /* meter_power */
          this.updateCapabilityValue('meter_power', result["emdata:0"].c_total_act_energy / 1000, 2);

          /* meter_power.returned */
          const c_total_act_ret_energy = result["emdata:0"].c_total_act_ret_energy / 1000;
          if (this.getCapabilityValue('meter_power.returned') !== c_total_act_ret_energy) {
            this.updateCapabilityValue('meter_power.returned', c_total_act_ret_energy, 2);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned').trigger(this, {'energy': c_total_act_ret_energy}, {}).catch(error => { this.error(error) });
          }

        }

      }

      // PRO instantaneous power readings EM1
      if (result.hasOwnProperty("em1:"+ channel)) {

        /* measure_power */
        this.updateCapabilityValue('measure_power', result["em1:"+channel].act_power, channel);

        /* meter_power_factor */
        this.parseCapabilityUpdate('meter_power_factor', result["em1:"+channel].pf, channel);

        /* measure_power_apparent */
        this.parseCapabilityUpdate('measure_power_apparent', result["em1:"+channel].aprt_power, channel);

        /* measure_current */
        this.updateCapabilityValue('measure_current', result["em1:"+channel].current, channel);

        /* measure_voltage */
        this.updateCapabilityValue('measure_voltage', result["em1:"+channel].voltage, channel);

      }

      // PRO total energy readings EMDATA1
      if (result.hasOwnProperty("emdata1:"+ channel)) {

        /* meter_power */
        this.updateCapabilityValue('meter_power', result["emdata1:"+channel].total_act_energy / 1000, channel);

        /* meter_power.returned */
        const total_act_ret_energy = result["emdata1:"+channel].total_act_ret_energy / 1000;
        this.updateCapabilityValue('meter_power.returned', total_act_ret_energy, channel);

      }

      // DEVICE POWER
      if (result.hasOwnProperty("devicepower:"+ channel)) {

        // measure_battery and measure_voltage for battery operated devices
        if (result["devicepower:"+channel].hasOwnProperty("battery")) {

          /* measure_battery */
          if (result["devicepower:"+channel].battery.hasOwnProperty("percent")) {
            this.updateCapabilityValue('measure_battery', result["devicepower:"+channel].battery.percent, channel);
          }

          /* measure_voltage */
          if (result["devicepower:"+channel].battery.hasOwnProperty("V")) {
            if (result["devicepower:"+channel].battery.V !== null) {
              this.updateCapabilityValue('measure_voltage', result["devicepower:"+channel].battery.V, channel);
            }
          }

        }

      }

      // TEMPERATURE
      if (result.hasOwnProperty("temperature:"+ channel)) {
        if (result["temperature:"+channel].hasOwnProperty("tC")) {
          this.updateCapabilityValue('measure_temperature', result["temperature:"+channel].tC, channel);
        }
      }

      // HUMIDITY
      if (result.hasOwnProperty("humidity:"+ channel)) {
        if (result["humidity:"+channel].hasOwnProperty("rh")) {
          this.updateCapabilityValue('measure_humidity', result["humidity:"+channel].rh, channel);
        }
      }

      // SMOKE
      if (result.hasOwnProperty("smoke:"+ channel)) {
        if (result["smoke:"+channel].hasOwnProperty("alarm")) {
          this.updateCapabilityValue('alarm_smoke', result["smoke:"+channel].alarm, channel);
        }
      }

      // INPUTS
      if (result.hasOwnProperty("input:0") && this.hasCapability('input_1') && channel === 0) { // update input_1 for channel 0
        if (result["input:0"].hasOwnProperty("state") && result["input:0"].state !== null) {
          const input1Triggercard = result["input:0"].state ? 'triggerInput1On' : 'triggerInput1Off';
          this.triggerDeviceTriggerCard('input_1', result["input:0"].state, this.getStoreValue('channel'), input1Triggercard, {}, {});
          this.triggerDeviceTriggerCard('input_1', result["input:0"].state, this.getStoreValue('channel'), 'triggerInput1Changed', {}, {});
          this.updateCapabilityValue('input_1', result["input:0"].state, channel);
        } else if (result["input:0"].hasOwnProperty("state") && result["input:0"].state === null && this.hasCapability('input_1')) { // remove input_1 for channel 0
          await this.removeCapability('input_1');
          this.log('Removing capability input_1 of channel 0 as the input is configured as button');
        }
      }

      if (result.hasOwnProperty("input:1")) {
        if (result["input:1"].hasOwnProperty("state") && result["input:1"].state !== null) {
          if (this.hasCapability('input_2') && channel === 0) { // update input_2 for channel 0
            const input2Triggercard = result["input:1"].state ? 'triggerInput2On' : 'triggerInput2Off';
            this.triggerDeviceTriggerCard('input_2', result["input:1"].state, 0, input2Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_2', result["input:1"].state, 0, 'triggerInput2Changed', {}, {});
            this.updateCapabilityValue('input_2', result["input:1"].state, 0);
          } else if (this.hasCapability('input_1') && channel === 1) { // update input_1 for channel 1
            const input2_1Triggercard = result["input:1"].state ? 'triggerInput1On' : 'triggerInput1Off';
            this.triggerDeviceTriggerCard('input_1', result["input:1"].state, 1, input2_1Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_1', result["input:1"].state, 1, 'triggerInput1Changed', {}, {});
            this.updateCapabilityValue('input_1', result["input:1"].state, 1);
          }
        } else if (result["input:1"].hasOwnProperty("state") && result["input:1"].state === null) {
          if (this.hasCapability('input_2') && channel === 0) { // remove input_2 for channel 0
            await this.removeCapability('input_2');
            this.log('Removing capability input_2 of channel 0 as the input is configured as button');
          } else if (this.hasCapability('input_1') && channel === 1) { // remove input_1 for channel 1
            await this.removeCapability('input_1');
            this.log('Removing capability input_1 of channel 1 as the input is configured as button');
          }
        }
      }

      if (result.hasOwnProperty("input:2")) {
        if (result["input:2"].hasOwnProperty("state") && result["input:2"].state !== null) {
          if (this.hasCapability('input_3') && channel === 0) { // update input_3 for channel 0
            const input3Triggercard = result["input:2"].state ? 'triggerInput3On' : 'triggerInput3Off';
            this.triggerDeviceTriggerCard('input_3', result["input:2"].state, 0, input3Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_3', result["input:2"].state, 0, 'triggerInput3Changed', {}, {});
            this.updateCapabilityValue('input_3', result["input:2"].state, channel);
          } else if (this.hasCapability('input_1') && channel === 2) { // update input_1 for channel 2
            const input3_1Triggercard = result["input:2"].state ? 'triggerInput1On' : 'triggerInput1Off';
            this.triggerDeviceTriggerCard('input_1', result["input:2"].state, 2, input3_1Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_1', result["input:2"].state, 2, 'triggerInput1Changed', {}, {});
            this.updateCapabilityValue('input_1', result["input:2"].state, channel);
          } else if (this.hasCapability('multiDividedInputs')) { // update input_3 for channel 1 for multichannel device with multiple inputs per channel
            const input3_1Triggercard = result["input:2"].state ? 'triggerInput3On' : 'triggerInput3Off';
            this.triggerDeviceTriggerCard('input_3', result["input:2"].state, 1, input3_1Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_3', result["input:2"].state, 1, 'triggerInput3Changed', {}, {});
            this.updateCapabilityValue('input_3', result["input:2"].state, 1);
          }
        } else if (result["input:2"].hasOwnProperty("state") && result["input:2"].state === null) {
          if (this.hasCapability('input_3') && channel === 0) { // remove input_3 for channel 0
            await this.removeCapability('input_3');
            this.log('Removing capability input_3 of channel 0 as the input is configured as button');
          } else if (this.hasCapability('input_1') && channel === 2) { // remove input_1 for channel 2
            await this.removeCapability('input_1');
            this.log('Removing capability input_1 of channel 2 as the input is configured as button');
          } else if (this.hasCapability('multiDividedInputs') && this.hasCapability('input_3')) {
            await this.removeCapability('input_3');
            this.log('Removing capability input_3 of channel 1 as the input is configured as button');
          }
        } else if (result["input:2"].hasOwnProperty("counts") && this.hasCapability('input_3') && channel === 0) { // update counts on channel 0 of Shelly Plus Uni
          if (result["input:2"].counts.hasOwnProperty("total")) {
            await this.updateCapabilityValue('input_pulse_counts_total', result["input:2"].counts.total, 0);
            if (this.getCapabilityValue('input_pulse_counts_total') !== result["input:2"].counts.total) {
              this.homey.flow.getDeviceTriggerCard('triggerInputCountsTotal').trigger(this, {'pulse': result["input:2"].counts.total}, {}).catch(error => { this.error(error) });
            }
          }
          if (result["input:2"].counts.hasOwnProperty("by_minute")) {
            await this.updateCapabilityValue('input_pulse_counts_minute', result["input:2"].counts.by_minute[0], 0);
            if (this.getCapabilityValue('input_pulse_counts_minute') !== result["input:2"].counts.by_minute[0]) {
              this.triggerDeviceTriggerCard('input_pulse_counts_minute', result["input:2"].counts.by_minute[0], 0, 'triggerInputCountsMinute', {}, {});
              this.homey.flow.getDeviceTriggerCard('triggerInputCountsTotal').trigger(this, {'pulse': result["input:2"].counts.by_minute[0]}, {}).catch(error => { this.error(error) });
            }
          }
        }
      }

      if (result.hasOwnProperty("input:3")) {
        if (result["input:3"].hasOwnProperty("state") && result["input:3"].state !== null) {
          if (this.hasCapability('input_4') && channel === 0) { // update input_4 for channel 0
            const input4Triggercard = result["input:3"].state ? 'triggerInput4On' : 'triggerInput4Off';
            this.triggerDeviceTriggerCard('input_4', result["input:3"].state, 0, input4Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_4', result["input:3"].state, 0, 'triggerInput4Changed', {}, {});
            this.updateCapabilityValue('input_4', result["input:3"].state, channel);
          } else if (this.hasCapability('input_1') && channel === 3) { // update input_1 for channel 3
            const input4_1Triggercard = result["input:3"].state ? 'triggerInput1On' : 'triggerInput1Off';
            this.triggerDeviceTriggerCard('input_1', result["input:3"].state, 3, input4_1Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_1', result["input:3"].state, 3, 'triggerInput1Changed', {}, {});
            this.updateCapabilityValue('input_1', result["input:3"].state, channel);
          } else if (this.hasCapability('multiDividedInputs')) { // update input_4 for channel 1 for multichannel device with multiple inputs per channel
            const input4_1Triggercard = result["input:3"].state ? 'triggerInput4On' : 'triggerInput4Off';
            this.triggerDeviceTriggerCard('input_4', result["input:3"].state, 1, input4_1Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_4', result["input:3"].state, 1, 'triggerInput4Changed', {}, {});
            this.updateCapabilityValue('input_4', result["input:3"].state, 1);
          }
        } else if (result["input:3"].hasOwnProperty("state") && result["input:3"].state === null) {
          if (this.hasCapability('input_4') && channel === 0) { // remove input_4 for channel 0
            await this.removeCapability('input_4');
            this.log('Removing capability input_4 of channel 0 as the input is configured as button');
          } else if (this.hasCapability('input_1') && channel === 3) { // remove input_1 for channel 3
            await this.removeCapability('input_1');
            this.log('Removing capability input_1 of channel 3 as the input is configured as button');
          } else if (this.hasCapability('multiDividedInputs') && this.hasCapability('input_4')) {
            await this.removeCapability('input_4');
            this.log('Removing capability input_4 of channel 1 as the input is configured as button');
          }
        }
      }

      // ADD ON SENSORS

      /* add-on temperature 1 */
      if (result.hasOwnProperty("temperature:100") && channel === 0) {
        if (this.hasCapability('measure_temperature.1')) {
          if (this.getCapabilityValue('measure_temperature.1') !== result["temperature:100"].tC) {
            this.updateCapabilityValue('measure_temperature.1', result["temperature:100"].tC, channel);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature1').trigger(this, {'temperature': result["temperature:100"].tC}, {}).catch(error => { this.error(error); this.error(result["temperature:100"].tC) });
          }
        } else {
          this.addCapability('measure_temperature.1');
        }
      }

      /* add-on temperature 2 */
      if (result.hasOwnProperty("temperature:101") && channel === 0) {
        if (this.hasCapability('measure_temperature.2')) {
          if (this.getCapabilityValue('measure_temperature.2') !== result["temperature:101"].tC) {
            this.updateCapabilityValue('measure_temperature.2', result["temperature:101"].tC, channel);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature2').trigger(this, {'temperature': result["temperature:101"].tC}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_temperature.2');
        }
      }

      /* add-on temperature 3 */
      if (result.hasOwnProperty("temperature:102") && channel === 0) {
        if (this.hasCapability('measure_temperature.3')) {
          if (this.getCapabilityValue('measure_temperature.3') !== result["temperature:102"].tC) {
            this.updateCapabilityValue('measure_temperature.3', result["temperature:102"].tC, channel);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature3').trigger(this, {'temperature': result["temperature:102"].tC}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_temperature.3');
        }
      }

      /* add-on temperature 4 */
      if (result.hasOwnProperty("temperature:103") && channel === 0) {
        if (this.hasCapability('measure_temperature.4')) {
          if (this.getCapabilityValue('measure_temperature.4') !== result["temperature:103"].tC) {
            this.updateCapabilityValue('measure_temperature.4', result["temperature:103"].tC, channel);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature4').trigger(this, {'temperature': result["temperature:103"].tC}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_temperature.4');
        }
      }

      /* add-on temperature 5 */
      if (result.hasOwnProperty("temperature:104") && channel === 0) {
        if (this.hasCapability('measure_temperature.5')) {
          if (this.getCapabilityValue('measure_temperature.5') !== result["temperature:104"].tC) {
            this.updateCapabilityValue('measure_temperature.5', result["temperature:104"].tC, channel);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature5').trigger(this, {'temperature': result["temperature:104"].tC}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_temperature.5');
        }
      }

      /* add-on humidity 1 */
      if (result.hasOwnProperty("humidity:100") && channel === 0) {
        if (this.hasCapability('measure_humidity.1')) {
          if (this.getCapabilityValue('measure_humidity.1') !== result["temperature:100"].tC) {
            this.updateCapabilityValue('measure_humidity.1', result["humidity:100"].rh, channel);
            this.homey.flow.getDeviceTriggerCard('triggerHumidity1').trigger(this, {'humidity': result["temperature:100"].rh}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_humidity.1');
        }
      }

      /* add-on humidity 2 */
      if (result.hasOwnProperty("humidity:101") && channel === 0) {
        if (this.hasCapability('measure_humidity.2')) {
          if (this.getCapabilityValue('measure_humidity.2') !== result["temperature:101"].tC) {
            this.updateCapabilityValue('measure_humidity.2', result["humidity:101"].rh, channel);
            this.homey.flow.getDeviceTriggerCard('triggerHumidity2').trigger(this, {'humidity': result["temperature:101"].rh}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_humidity.2');
        }
      }

      /* add-on humidity 3 */
      if (result.hasOwnProperty("humidity:102") && channel === 0) {
        if (this.hasCapability('measure_humidity.3')) {
          if (this.getCapabilityValue('measure_humidity.3') !== result["temperature:102"].tC) {
            this.updateCapabilityValue('measure_humidity.3', result["humidity:102"].rh, channel);
            this.homey.flow.getDeviceTriggerCard('triggerHumidity3').trigger(this, {'humidity': result["temperature:102"].rh}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_humidity.3');
        }
      }

      /* add-on humidity 4 */
      if (result.hasOwnProperty("humidity:103") && channel === 0) {
        if (this.hasCapability('measure_humidity.4')) {
          if (this.getCapabilityValue('measure_humidity.4') !== result["temperature:103"].tC) {
            this.updateCapabilityValue('measure_humidity.4', result["humidity:103"].rh, channel);
            this.homey.flow.getDeviceTriggerCard('triggerHumidity4').trigger(this, {'humidity': result["temperature:103"].rh}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_humidity.4');
        }
      }

      /* add-on humidity 5 */
      if (result.hasOwnProperty("humidity:104") && channel === 0) {
        if (this.hasCapability('measure_humidity.5')) {
          if (this.getCapabilityValue('measure_humidity.5') !== result["temperature:104"].tC) {
            this.updateCapabilityValue('measure_humidity.5', result["humidity:104"].rh, channel);
            this.homey.flow.getDeviceTriggerCard('triggerHumidity4').trigger(this, {'humidity': result["temperature:104"].rh}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_humidity.5');
        }
      }

      /* add-on input 1 */
      if (result.hasOwnProperty("input:100") && channel === 0) {
        if (result["input:100"].type === 'analog') {
          if (this.hasCapability('input_analog_external_1')) {
            if (this.getCapabilityValue('input_analog_external_1') !== result["input:100"].percent) {
              this.updateCapabilityValue('input_analog_external_1', result["input:100"].precent, 0);
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputAnalogExternal1Changed').trigger(this, {'percentage': result["input:100"].precent}, {}).catch(error => { this.error(error) });
            }
          } else {
            this.addCapability('input_analog_external_1');
          }
        } else {
          if (this.hasCapability('input_external_1')) {
            if (this.getCapabilityValue('input_external_1') !== result["input:100"].state) {
              this.updateCapabilityValue('input_external_1', result["input:100"].state, 0);
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal1Changed').trigger(this, {}, {}).catch(error => { this.error(error) });
              if (result["input:100"].state) {
                this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal1On').trigger(this, {}, {}).catch(error => { this.error(error) });
              } else {
                this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal1Off').trigger(this, {}, {}).catch(error => { this.error(error) });
              }
            }
          } else {
            this.addCapability('input_external_1');
          }
        }        
      }

      /* add-on input 2 */
      if (result.hasOwnProperty("input:101") && channel === 0) {
        if (result["input:101"].type === 'analog') {
          if (this.hasCapability('input_analog_external_2')) {
            if (this.getCapabilityValue('input_analog_external_2') !== result["input:101"].percent) {
              this.updateCapabilityValue('input_analog_external_2', result["input:101"].precent, 0);
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputAnalogExternal2Changed').trigger(this, {'percentage': result["input:101"].precent}, {}).catch(error => { this.error(error) });
            }
          } else {
            this.addCapability('input_analog_external_2');
          }
        } else {
          if (this.hasCapability('input_external_2')) {
            if (this.getCapabilityValue('input_external_2') !== result["input:101"].state) {
              this.updateCapabilityValue('input_external_2', result["input:101"].state, 0);
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal2Changed').trigger(this, {}, {}).catch(error => { this.error(error) });
              if (result["input:101"].state) {
                this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal2On').trigger(this, {}, {}).catch(error => { this.error(error) });
              } else {
                this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal2Off').trigger(this, {}, {}).catch(error => { this.error(error) });
              }
            }
          } else {
            this.addCapability('input_external_2');
          }
        }
      }

      /* add-on input 3 */
      if (result.hasOwnProperty("input:102") && channel === 0) {
        if (result["input:102"].type === 'analog') {
          if (this.hasCapability('input_analog_external_3')) {
            if (this.getCapabilityValue('input_analog_external_3') !== result["input:102"].percent) {
              this.updateCapabilityValue('input_analog_external_3', result["input:102"].precent, 0);
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputAnalogExternal3Changed').trigger(this, {'percentage': result["input:102"].precent}, {}).catch(error => { this.error(error) });
            }
          } else {
            this.addCapability('input_analog_external_3');
          }
        } else {
          if (this.hasCapability('input_external_3')) {
            if (this.getCapabilityValue('input_external_3') !== result["input:102"].state) {
              this.updateCapabilityValue('input_external_3', result["input:102"].state, 0);
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal3Changed').trigger(this, {}, {}).catch(error => { this.error(error) });
              if (result["input:102"].state) {
                this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal3On').trigger(this, {}, {}).catch(error => { this.error(error) });
              } else {
                this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal3Off').trigger(this, {}, {}).catch(error => { this.error(error) });
              }
            }
          } else {
            this.addCapability('input_external_3');
          }
        }
      }

      /* add-on input 4 */
      if (result.hasOwnProperty("input:103") && channel === 0) {
        if (result["input:103"].type === 'analog') {
          if (this.hasCapability('input_analog_external_4')) {
            if (this.getCapabilityValue('input_analog_external_4') !== result["input:103"].percent) {
              this.updateCapabilityValue('input_analog_external_4', result["input:103"].precent, 0);
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputAnalogExternal4Changed').trigger(this, {'percentage': result["input:103"].precent}, {}).catch(error => { this.error(error) });
            }
          } else {
            this.addCapability('input_analog_external_4');
          }
        } else {
          if (this.hasCapability('input_external_4')) {
            if (this.getCapabilityValue('input_external_4') !== result["input:103"].state) {
              this.updateCapabilityValue('input_external_4', result["input:103"].state, 0);
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal4Changed').trigger(this, {}, {}).catch(error => { this.error(error) });
              if (result["input:103"].state) {
                this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal4On').trigger(this, {}, {}).catch(error => { this.error(error) });
              } else {
                this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal4Off').trigger(this, {}, {}).catch(error => { this.error(error) });
              }
            }
          } else {
            this.addCapability('input_external_4');
          }
        }
      }

      /* add-on input 5 */
      if (result.hasOwnProperty("input:104") && channel === 0) {
        if (result["input:104"].type === 'analog') {
          if (this.hasCapability('input_analog_external_5')) {
            if (this.getCapabilityValue('input_analog_external_5') !== result["input:104"].percent) {
              this.updateCapabilityValue('input_analog_external_5', result["input:104"].precent, 0);
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputAnalogExternal5Changed').trigger(this, {'percentage': result["input:104"].precent}, {}).catch(error => { this.error(error) });
            }
          } else {
            this.addCapability('input_analog_external_5');
          }
        } else {
          if (this.hasCapability('input_external_5')) {
            if (this.getCapabilityValue('input_external_5') !== result["input:104"].state) {
              this.updateCapabilityValue('input_external_5', result["input:104"].state, 0);
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal5Changed').trigger(this, {}, {}).catch(error => { this.error(error) });
              if (result["input:104"].state) {
                this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal5On').trigger(this, {}, {}).catch(error => { this.error(error) });
              } else {
                this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal5Off').trigger(this, {}, {}).catch(error => { this.error(error) });
              }
            }
          } else {
            this.addCapability('input_external_5');
          }
        }
      }

      /* add-on voltage 1 */
      if (result.hasOwnProperty("voltmeter:100") && channel === 0) {
        if (this.hasCapability('measure_voltage.1')) {
          if (this.getCapabilityValue('measure_voltage.1') !== result["voltmeter:100"].voltage) {
            this.updateCapabilityValue('measure_voltage.1', result["voltmeter:100"].voltage, channel);
            this.homey.flow.getDeviceTriggerCard('triggerVoltmeter1').trigger(this, {'voltage': result["voltmeter:100"].voltage}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_voltage.1');
        }
      }

      /* add-on voltage 2 */
      if (result.hasOwnProperty("voltmeter:101") && channel === 0) {
        if (this.hasCapability('measure_voltage.2')) {
          if (this.getCapabilityValue('measure_voltage.2') !== result["voltmeter:101"].voltage) {
            this.updateCapabilityValue('measure_voltage.2', result["voltmeter:101"].voltage, channel);
            this.homey.flow.getDeviceTriggerCard('triggerVoltmeter2').trigger(this, {'voltage': result["voltmeter:101"].voltage}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_voltage.2');
        }
      }

      /* add-on voltage 3 */
      if (result.hasOwnProperty("voltmeter:102") && channel === 0) {
        if (this.hasCapability('measure_voltage.3')) {
          if (this.getCapabilityValue('measure_voltage.3') !== result["voltmeter:102"].voltage) {
            this.updateCapabilityValue('measure_voltage.3', result["voltmeter:102"].voltage, channel);
            this.homey.flow.getDeviceTriggerCard('triggerVoltmeter3').trigger(this, {'voltage': result["voltmeter:102"].voltage}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_voltage.3');
        }
      }

      /* add-on voltage 4 */
      if (result.hasOwnProperty("voltmeter:103") && channel === 0) {
        if (this.hasCapability('measure_voltage.4')) {
          if (this.getCapabilityValue('measure_voltage.4') !== result["voltmeter:103"].voltage) {
            this.updateCapabilityValue('measure_voltage.4', result["voltmeter:103"].voltage, channel);
            this.homey.flow.getDeviceTriggerCard('triggerVoltmeter4').trigger(this, {'voltage': result["voltmeter:103"].voltage}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_voltage.4');
        }
      }

      /* add-on voltage 5 */
      if (result.hasOwnProperty("voltmeter:104") && channel === 0) {
        if (this.hasCapability('measure_voltage.5')) {
          if (this.getCapabilityValue('measure_voltage.5') !== result["voltmeter:104"].voltage) {
            this.updateCapabilityValue('measure_voltage.5', result["voltmeter:104"].voltage, channel);
            this.homey.flow.getDeviceTriggerCard('triggerVoltmeter5').trigger(this, {'voltage': result["voltmeter:104"].voltage}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_voltage.5');
        }
      }

      /* add-on switch 1 */
      if (result.hasOwnProperty("switch:100") && channel === 0) {
        if (this.hasCapability('onoff.1')) {
          if (this.getCapabilityValue('onoff.1') !== result["switch:100"].output) {
            this.updateCapabilityValue('onoff.1', result["switch:100"].output, channel);
            this.homey.flow.getDeviceTriggerCard('triggerExternalSwitch1').trigger(this, {'onoff': result["switch:100"].output}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('onoff.1');
        }
      }

      /* add-on switch 2 */
      if (result.hasOwnProperty("switch:101") && channel === 0) {
        if (this.hasCapability('onoff.2')) {
          if (this.getCapabilityValue('onoff.2') !== result["switch:101"].output) {
            this.updateCapabilityValue('onoff.2', result["switch:101"].output, channel);
            this.homey.flow.getDeviceTriggerCard('triggerExternalSwitch2').trigger(this, {'onoff': result["switch:101"].output}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('onoff.2');
        }
      }

      /* add-on switch 3 */
      if (result.hasOwnProperty("switch:102") && channel === 0) {
        if (this.hasCapability('onoff.3')) {
          if (this.getCapabilityValue('onoff.3') !== result["switch:102"].output) {
            this.updateCapabilityValue('onoff.3', result["switch:102"].output, channel);
            this.homey.flow.getDeviceTriggerCard('triggerExternalSwitch3').trigger(this, {'onoff': result["switch:102"].output}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('onoff.3');
        }
      }

      /* add-on switch 4 */
      if (result.hasOwnProperty("switch:103") && channel === 0) {
        if (this.hasCapability('onoff.4')) {
          if (this.getCapabilityValue('onoff.4') !== result["switch:103"].output) {
            this.updateCapabilityValue('onoff.4', result["switch:103"].output, channel);
            this.homey.flow.getDeviceTriggerCard('triggerExternalSwitch4').trigger(this, {'onoff': result["switch:103"].output}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('onoff.4');
        }
      }

      /* add-on switch 5 */
      if (result.hasOwnProperty("switch:104") && channel === 0) {
        if (this.hasCapability('onoff.5')) {
          if (this.getCapabilityValue('onoff.5') !== result["switch:104"].output) {
            this.updateCapabilityValue('onoff.5', result["switch:104"].output, channel);
            this.homey.flow.getDeviceTriggerCard('triggerExternalSwitch5').trigger(this, {'onoff': result["switch:104"].output}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('onoff.5');
        }
      }

      // ACTION EVENTS (for GEN2 cloud devices only)
      if (result.hasOwnProperty("v_eve:0")) {
        if (result["v_eve:0"].hasOwnProperty("ev")) {
          if (result["v_eve:0"].ev !== '') {
            const action_event_1 = this.util.getActionEventDescription(result["v_eve:0"].ev, 'cloud', 'gen2') + '_1';
            if (channel === 0 && this.hasCapability('multiInputs')) {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action_event_1}, {"action": action_event_1}).catch(error => { this.error(error) });

              // TODO: remove this eventually
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action_event_1}, {"id": this.getData().id, "device": this.getName(), "action": action_event_1}).catch(error => { this.error(error) });
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.util.getActionEventDescription(result["v_eve:0"].ev, 'cloud', 'gen2')}, {"action": this.util.getActionEventDescription(result["v_eve:0"].ev, 'cloud', 'gen2')}).catch(error => { this.error(error) });

              // TODO: remove this eventually
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.util.getActionEventDescription(result["v_eve:0"].ev, 'cloud', 'gen2')}, {"id": this.getData().id, "device": this.getName(), "action": this.util.getActionEventDescription(result["v_eve:0"].ev, 'cloud', 'gen2')}).catch(error => { this.error(error) });
            }
          }
        }
      }

      if (result.hasOwnProperty("v_eve:1")) {
        if (result["v_eve:1"].hasOwnProperty("ev")) {
          if (result["v_eve:1"].ev !== '') {
            const action_event_2 = this.util.getActionEventDescription(result["v_eve:1"].ev, 'cloud', 'gen2') + '_2';
            if (channel === 0 && this.hasCapability('multiInputs')) {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action_event_2}, {"action": action_event_2}).catch(error => { this.error(error) });

              // TODO: remove this eventually
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action_event_2}, {"id": this.getData().id, "device": this.getName(), "action": action_event_2}).catch(error => { this.error(error) });
            } else {
              const device_id = this.getStoreValue('main_device') + '-channel-1';
              const shellies = this.homey.app.getShellyCollection();
              const shelly = shellies.filter(shelly => shelly.id.includes(device_id));
              const device = shelly[0].device;
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.util.getActionEventDescription(result["v_eve:1"].ev, 'cloud', 'gen2')}, {"action": this.util.getActionEventDescription(result["v_eve:1"].ev, 'cloud', 'gen2')}).catch(error => { this.error(error) });

              // TODO: remove this eventually
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": device.getData().id, "device": device.getName(), "action": this.util.getActionEventDescription(result["v_eve:1"].ev, 'cloud', 'gen2')}, {"id": device.getData().id, "device": device.getName(), "action": this.util.getActionEventDescription(result["v_eve:1"].ev, 'cloud', 'gen2')}).catch(error => { this.error(error) });
            }
          }
        }
      }

      if (result.hasOwnProperty("v_eve:2")) {
        if (result["v_eve:2"].hasOwnProperty("ev")) {
          if (result["v_eve:2"].ev !== '') {
            const action_event_3 = this.util.getActionEventDescription(result["v_eve:2"].ev, 'cloud', 'gen2') + '_3';
            if (channel === 0 && this.hasCapability('multiInputs')) {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action_event_3}, {"action": action_event_3}).catch(error => { this.error(error) });

              // TODO: remove this eventually
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action_event_3}, {"id": this.getData().id, "device": this.getName(), "action": action_event_3}).catch(error => { this.error(error) });
            } else {
              const device_id = this.getStoreValue('main_device') + '-channel-2';
              const shellies = this.homey.app.getShellyCollection();
              const shelly = shellies.filter(shelly => shelly.id.includes(device_id));
              const device = shelly[0].device;
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.util.getActionEventDescription(result["v_eve:2"].ev, 'cloud', 'gen2')}, {"action": this.util.getActionEventDescription(result["v_eve:2"].ev, 'cloud', 'gen2')}).catch(error => { this.error(error) });

              // TODO: remove this eventually
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": device.getData().id, "device": device.getName(), "action": this.util.getActionEventDescription(result["v_eve:2"].ev, 'cloud', 'gen2')}, {"id": device.getData().id, "device": device.getName(), "action": this.util.getActionEventDescription(result["v_eve:2"].ev, 'cloud', 'gen2')}).catch(error => { this.error(error) });
            }
          }
        }
      }

      if (result.hasOwnProperty("v_eve:3")) {
        if (result["v_eve:3"].hasOwnProperty("ev")) {
          if (result["v_eve:3"].ev !== '') {
            const action_event_4 = this.util.getActionEventDescription(result["v_eve:3"].ev, 'cloud', 'gen2') + '_4';
            if (channel === 0 && this.hasCapability('multiInputs')) {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action_event_4}, {"action": action_event_4}).catch(error => { this.error(error) });

              // TODO: remove this eventually
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action_event_4}, {"id": this.getData().id, "device": this.getName(), "action": action_event_4}).catch(error => { this.error(error) });
            } else {
              const device_id = this.getStoreValue('main_device') + '-channel-3';
              const shellies = this.homey.app.getShellyCollection();
              const shelly = shellies.filter(shelly => shelly.id.includes(device_id));
              const device = shelly[0].device;
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.util.getActionEventDescription(result["v_eve:3"].ev, 'cloud', 'gen2')}, {"action": this.util.getActionEventDescription(result["v_eve:3"].ev, 'cloud', 'gen2')}).catch(error => { this.error(error) });

              // TODO: remove this eventually
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": device.getData().id, "device": device.getName(), "action": this.util.getActionEventDescription(result["v_eve:3"].ev, 'cloud', 'gen2')}, {"id": device.getData().id, "device": device.getName(), "action": this.util.getActionEventDescription(result["v_eve:3"].ev, 'cloud', 'gen2')}).catch(error => { this.error(error) });
            }
          }
        }
      }

      // DEVICE TEMPERATURE
      if (result.hasOwnProperty("systemp") && this.hasCapability('measure_temperature') && channel === 0) {
        this.updateCapabilityValue('measure_temperature', result.systemp.tC, 0);
      }

      // RSSI
      if (result.hasOwnProperty("wifi")) {
        if (result.wifi.hasOwnProperty("rssi") && this.hasCapability('rssi') && channel === 0) {
          this.updateCapabilityValue('rssi', result.wifi.rssi);
        }
      }
      if (result.hasOwnProperty("reporter")) {
        if (result.reporter.hasOwnProperty("rssi")) {
          if (result.reporter.hasOwnProperty("rssi") && channel === 0) {
            this.updateCapabilityValue('rssi', result.reporter.rssi);
          }
        }
      }

      // FIRMWARE UPDATE AVAILABLE
      if (result.hasOwnProperty("sys")) {
        if (result.sys.hasOwnProperty("available_updates")) {
          if (result.sys.available_updates.hasOwnProperty("stable")) {
            if (result.sys.available_updates.stable.hasOwnProperty("version")) {
              this.homey.flow.getTriggerCard('triggerFWUpdate').trigger({"id": this.getData().id, "device": this.getName(), "firmware": result.sys.available_updates.stable.version }).catch(error => { this.error(error) });
              await this.setStoreValue("latest_firmware", result.sys.available_updates.stable.version);
            }
          }
        }
      }
    } catch (error) {
      this.error(error);
    }
  }

  /* generic component status update parser for local WEBSOCKET messages */
  async parseSingleStatusUpdateGen2(result = {}) {
    try {
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
                  this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": this.getName(), "device_error": element.toString()}).catch(error => { this.error(error) });
                });
              } else if (capability !== 'component' && capability !== 'id' && capability !== 'source' && capability !== 'type' && capability !== 'schedules') {

                if (typeof value === 'object' && value !== null) { /* parse aenergy and device temperature data */
                  if (capability === 'aenergy') {
                    for (const [capability, values] of Object.entries(value)) {
                      if (capability == 'total') {
                        this.parseCapabilityUpdate('meter_power', values, channel);
                      }
                    }
                  } else if (capability === 'ret_aenergy') {
                    for (const [capability, values] of Object.entries(value)) {
                      if (capability === 'total') {
                        this.parseCapabilityUpdate('meter_power_returned', values, channel);
                      }
                    }
                  } else if (capability === 'counts') {
                    for (const [capability, values] of Object.entries(value)) {
                      if (capability === 'total') {
                        this.parseCapabilityUpdate('input_pulse_counts_total', values, 0);
                      } else if (capability === 'by_minute') {
                        this.parseCapabilityUpdate('input_pulse_counts_minute', values[0], 0);
                      }
                    }
                  } else {
                    for (const [capability, values] of Object.entries(value)) {
                      if (capability !== 'by_minute' && capability !== 'minute_ts' && capability !== 'tF') {
                        this.parseCapabilityUpdate(capability, values, channel);
                      }
                    }
                  }
                } else if (component.startsWith('input') && value !== null) { /* parse inputs data */
                  let input = component.replace(":", "");
                  if (typeof value === 'number') { // external inputs of type analog
                    this.parseCapabilityUpdate(input+"_analog", value, 0);
                  } else {
                    if (channel === 100 || channel === 101 || channel === 102 || channel === 103 || channel === 104) { // external inputs of type switch or button
                      this.parseCapabilityUpdate(input, value, 0);
                    } else if (this.hasCapability('multiDividedInputs')) { // inputs for multichannel devices with multi inputs per channel
                      if (input === 'input0' || input === 'input1') {
                        this.parseCapabilityUpdate(input, value, 0);
                      } else if (input === 'input2' || input === 'input3') {
                        this.parseCapabilityUpdate(input, value, 1);
                      }
                    } else if (channel === 0 || this.hasCapability('input_2')) { // if channel is 0 or device is not a multichannel device in Homey we need to hard set channel to 0 to update the capability of this device
                      this.parseCapabilityUpdate(input, value, 0);
                    } else { // it's a multichannel input and we need to update the correct device, it's a bit hacky though
                      const device_id = this.getStoreValue('main_device') + '-channel-' + channel;
                      const shellies = this.homey.app.getShellyCollection();
                      const shelly = shellies.filter(shelly => shelly.id.includes(device_id));
                      const device = shelly[0].device;
                      if (device) {
                        device.parseCapabilityUpdate(input, value, channel);
                      }
                    }
                  }
                } else if (component.startsWith('smoke') && capability === 'alarm')  {
                  this.parseCapabilityUpdate('alarm_smoke', value, channel);
                } else if (component.startsWith('boolean') || component.startsWith('number') || component.startsWith('text') || component.startsWith('enum'))  {
                  let type = component.substring(0, component.length - 4);
                  let boolean = false;
                  let number = 0;
                  let text = 'empty';
                  let enumeration = 'none';
    
                  switch (type) {
                    case 'boolean':
                      boolean = value;
                      break;
                    case 'number':
                      number = value;
                      break;
                    case 'text':
                      text = value;
                      break;
                    case 'enum':
                      enumeration = value;
                      break;
                    default:
                      break;
                  }
                  this.homey.flow.getDeviceTriggerCard('triggerVirtualComponents').trigger(
                    this,
                    {"vc_type": type, "vc_id": component, "boolean": boolean, "number": number, "text": text, "enum": enumeration}, 
                    {"vc_id": component}
                  ).catch(error => { this.error(error) });
                } else {
                  this.parseCapabilityUpdate(capability, value, channel);
                }
              }
            }
          });
        } else if (result.method === 'NotifyEvent') { /* parse action event updates */
          result.params.events.forEach(async (event) => {
            try {

              if (event.component.startsWith('input') || event.component === undefined) { // parse input events
                let device;
                let device_id;
                let action_event;
                let channel = event.id || 0;

                // get the right device
                if (
                  channel === 0 ||
                  this.hasCapability('multiInputs') ||
                  (this.hasCapability('multiDividedInputs') && channel === 0 && this.hasCapability('input_1')) ||
                  (this.hasCapability('multiDividedInputs') && channel === 1 && this.hasCapability('input_2')) ||
                  (this.hasCapability('multiDividedInputs') && channel === 2 && this.hasCapability('input_3')) ||
                  (this.hasCapability('multiDividedInputs') && channel === 3 && this.hasCapability('input_4'))
                ) { // if channel is 0 or device has multiple inputs but is not a multichannel device in Homey we have the right device
                  device = this;
                } else { // get the right device based on the channel

                  /* get the device id with exceptions for for multichannel devices with multi inputs per channel */
                  if (this.hasCapability('multiDividedInputs') && (channel === 0 || channel === 1)) {
                    device_id = this.getStoreValue('main_device') + '-channel-0';
                  } else if (this.hasCapability('multiDividedInputs') && (channel === 2 || channel === 3)) {
                    device_id = this.getStoreValue('main_device') + '-channel-1';
                  } else {
                    device_id = this.getStoreValue('main_device') + '-channel-' + channel;
                  }

                  const shellies = this.homey.app.getShellyCollection();
                  const shelly = shellies.filter(shelly => shelly.id.includes(device_id));
                  device = shelly[0].device;
                }

                if (device) {
                  // get the right action
                  if ((device.getStoreValue('channel') === 0 && device.hasCapability('multiInputs')) || device.hasCapability('multiDividedInputs')) { // if channel is 0 and device has multiple inputs but is not a multichannel device in Homey we need to add the channel to the action
                    const event_channel = channel + 1;
                    action_event = this.util.getActionEventDescription(event.event, 'websocket', 'gen2') + '_' + event_channel;
                  } else {
                    action_event = this.util.getActionEventDescription(event.event, 'websocket', 'gen2');
                  }
                  this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(device, {"action": action_event}, {"action": action_event}).catch(error => { this.error(error) });

                  // TODO: remove this eventually
                  this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": device.getData().id, "device": device.getName(), "action": action_event }, {"id": device.getData().id, "device": device.getName(), "action": action_event }).catch(error => { this.error(error) });
                }
                
              }
            } catch (error) {
              this.error(error);
            }
          });
        }
      }
    } catch (error) {
      this.error(error);
    }
  }

  /* process capability updates from CoAP and gen2 websocket devices */
  async parseCapabilityUpdate(capability, value, channel = 0) {
    try {
      if (!this.getAvailable()) { await this.setAvailable().catch(this.error); }

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
          if (channel < 100) {
            this.updateCapabilityValue('onoff', value, channel);
          } else if (this.getStoreValue('channel') === 0 && channel === 100 && this.hasCapability('onoff.1')) {
            if (this.getCapabilityValue('onoff.1') !== value) {
              this.updateCapabilityValue('onoff.1', value, channel);
              this.homey.flow.getDeviceTriggerCard('triggerExternalSwitch1').trigger(this, {'onoff': value}, {}).catch(error => { this.error(error) });
            }
          } else if (this.getStoreValue('channel') === 0 && channel === 101 && this.hasCapability('onoff.2')) {
            if (this.getCapabilityValue('onoff.2') !== value) {
              this.updateCapabilityValue('onoff.2', value);
              this.homey.flow.getDeviceTriggerCard('triggerExternalSwitch2').trigger(this, {'onoff': value}, {}).catch(error => { this.error(error) });
            }
          } else if (this.getStoreValue('channel') === 0 && channel === 102 && this.hasCapability('onoff.3')) {
            if (this.getCapabilityValue('onoff.3') !== value) {
              this.updateCapabilityValue('onoff.3', value, channel);
              this.homey.flow.getDeviceTriggerCard('triggerExternalSwitch1').trigger(this, {'onoff': value}, {}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'apower':
        case 'power0':
        case 'power1':
        case 'power2':
        case 'power3':
          this.updateCapabilityValue('measure_power', value, channel);
          break;
        case 'act_power':
          this.updateCapabilityValue('measure_power', value, channel);
          break;
        case 'a_act_power':
          this.updateCapabilityValue('measure_power', value, 0);
          break;
        case 'b_act_power':
          this.updateCapabilityValue('measure_power', value, 1);
          break;
        case 'c_act_power':
          this.updateCapabilityValue('measure_power', value, 2);
          break;
        case 'total_act_power':
          if (this.getStoreValue('channel') === 0) {
            if (this.getCapabilityValue('measure_power.total') !== value) { 
              this.updateCapabilityValue('measure_power.total', value, 0);
              this.homey.flow.getDeviceTriggerCard('triggerMeasurePowerTotal').trigger(this, {'power': value}, {}).catch(error => { this.error(error) });
            }
          }
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
        case 'total_act_energy':
          const total_act_energy = value / 1000;
          this.updateCapabilityValue('meter_power', total_act_energy, channel);
          break;
        case 'a_total_act_energy':
          const a_total_act_energy = value / 1000;
          this.updateCapabilityValue('meter_power', a_total_act_energy, 0);
          break;
        case 'b_total_act_energy':
          const b_total_act_energy = value / 1000;
          this.updateCapabilityValue('meter_power', b_total_act_energy, 1);
          break;
        case 'c_total_act_energy':
          const c_total_act_energy = value / 1000;
          this.updateCapabilityValue('meter_power', c_total_act_energy, 2);
          break;
        case 'meter_power':
          const meter_power_pm = value / 1000;
          this.updateCapabilityValue('meter_power', meter_power_pm, channel);
          break;
        case 'meter_power_returned':
          const meter_power_returned_pm = value / 1000;
          this.updateCapabilityValue('meter_power.returned', meter_power_returned_pm, channel);
          break;
        case 'total_act':
          if (this.getStoreValue('channel') === 0) {
            const meter_power_total_act = value / 1000;
            if (this.getCapabilityValue('meter_power.total') !== meter_power_total_act) {
              this.updateCapabilityValue('meter_power.total', meter_power_total_act, 0);
              this.homey.flow.getDeviceTriggerCard('triggerMeterPowerTotal').trigger(this, {'energy': meter_power_total_act}, {}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'energyReturned0':
        case 'energyReturned1':
        case 'energyReturned2':
          let meter_power_returned = value / 1000;
          let meter_power_returned_rounded = Number(meter_power_returned.toFixed(3));
          if (meter_power_returned_rounded != this.getCapabilityValue('meter_power_returned')) {
            this.updateCapabilityValue('meter_power_returned', meter_power_returned_rounded, channel);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned').trigger(this, {'energy': meter_power_returned_rounded}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'total_act_ret_energy':
          const total_act_ret_energy = value / 1000;
          if (this.getCapabilityValue('meter_power.returned') !== total_act_ret_energy) {
            this.updateCapabilityValue('meter_power.returned', total_act_ret_energy, channel);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned').trigger(this, {'energy': total_act_ret_energy}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'a_total_act_ret_energy':
          const a_total_act_ret_energy = value / 1000;
          if (this.getCapabilityValue('meter_power.returned') !== a_total_act_ret_energy) {
            this.updateCapabilityValue('meter_power.returned', a_total_act_ret_energy, 0);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned').trigger(this, {'energy': a_total_act_ret_energy}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'b_total_act_ret_energy':
          const b_total_act_ret_energy = value / 1000;
          if (this.getCapabilityValue('meter_power.returned') !== b_total_act_ret_energy) {
            this.updateCapabilityValue('meter_power.returned', b_total_act_ret_energy, 1);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned').trigger(this, {'energy': b_total_act_ret_energy}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'c_total_act_ret_energy':
          const c_total_act_ret_energy = value / 1000;
          if (this.getCapabilityValue('meter_power.returned') !== c_total_act_ret_energy) {
            this.updateCapabilityValue('meter_power.returned', c_total_act_ret_energy, 2);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned').trigger(this, {'energy': c_total_act_ret_energy}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'total_act_ret':
          if (this.getStoreValue('channel') === 0) {
            const meter_power_total_returned = value / 1000;
            if (this.getCapabilityValue('meter_power.total_returned') !== meter_power_total_returned) {
              this.updateCapabilityValue('meter_power.total_returned', meter_power_total_returned, 0);
              this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned').trigger(this, {'energy': meter_power_total_returned}, {}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'powerFactor0':
        case 'powerFactor1':
        case 'powerFactor2':
          if (value != this.getCapabilityValue('meter_power_factor')) {
            this.updateCapabilityValue('meter_power_factor', value, channel);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerFactor').trigger(this, {'pf': value}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'pf':
          this.updateCapabilityValue('meter_power_factor', value, channel);
          break;
        case 'a_pf':
          this.updateCapabilityValue('meter_power_factor', value, 0);
          this.homey.flow.getDeviceTriggerCard('triggerMeterPowerFactor').trigger(this, {'pf': value}, {}).catch(error => { this.error(error) });
          break;
        case 'b_pf':
          this.updateCapabilityValue('meter_power_factor', value, 1);
          this.homey.flow.getDeviceTriggerCard('triggerMeterPowerFactor').trigger(this, {'pf': value}, {}).catch(error => { this.error(error) });
          break;
        case 'c_pf':
          this.updateCapabilityValue('meter_power_factor', value, 2);
          this.homey.flow.getDeviceTriggerCard('triggerMeterPowerFactor').trigger(this, {'pf': value}, {}).catch(error => { this.error(error) });
          break;
        case 'aprt_power':
          this.updateCapabilityValue('measure_power_apparent', value, channel);
          break;
        case 'current':
        case 'current0':
        case 'current1':
        case 'current2':
          this.updateCapabilityValue('measure_current', value, channel);
          break;
        case 'a_current':
          this.updateCapabilityValue('measure_current', value, 0);
          break;
        case 'b_current':
          this.updateCapabilityValue('measure_current', value, 1);
          break;
        case 'c_current':
          this.updateCapabilityValue('measure_current', value, 2);
          break;
        case 'total_current':
          if (this.getStoreValue('channel') === 0) {
            this.updateCapabilityValue('measure_current.total', value, 0);
          }
          break;
        case 'voltage':
        case 'voltage0':
        case 'voltage1':
        case 'voltage2':
        case 'V':
          if (channel < 100) {
            this.updateCapabilityValue('measure_voltage', value, channel);
          } else if (this.getStoreValue('channel') === 0 && channel === 100 && this.hasCapability('measure_voltage.1')) {
            if (this.getCapabilityValue('measure_voltage.1') !== value) {
              this.updateCapabilityValue('measure_voltage.1', value, channel);
              this.homey.flow.getDeviceTriggerCard('triggerVoltmeter1').trigger(this, {'voltage': value}, {}).catch(error => { this.error(error) });
            }
          } else if (this.getStoreValue('channel') === 0 && channel === 101 && this.hasCapability('measure_voltage.2')) {
            if (this.getCapabilityValue('measure_voltage.2') !== value) {
              this.updateCapabilityValue('measure_voltage.2', value, channel);
              this.homey.flow.getDeviceTriggerCard('triggerVoltmeter2').trigger(this, {'voltage': value}, {}).catch(error => { this.error(error) });
            }
          } else if (this.getStoreValue('channel') === 0 && channel === 102 && this.hasCapability('measure_voltage.2')) {
            if (this.getCapabilityValue('measure_voltage.3') !== value) {
              this.updateCapabilityValue('measure_voltage.3', value, channel);
              this.homey.flow.getDeviceTriggerCard('triggerVoltmeter3').trigger(this, {'voltage': value}, {}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'a_voltage':
          this.updateCapabilityValue('measure_voltage', value, 0);
          break;
        case 'b_voltage':
          this.updateCapabilityValue('measure_voltage', value, 1);
          break;
        case 'c_voltage':
          this.updateCapabilityValue('measure_voltage', value, 2);
          break;
        case 'overPower':
        case 'overPower0':
        case 'overPower1':
          if (value) {
            this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": this.getName(), "device_error": this.homey.__('device.overpower')}).catch(error => { this.error(error) });
          }
          break;
        case 'battery':
        case 'percent':
          let measure_battery = this.util.clamp(value, 0, 100);
          this.updateCapabilityValue('measure_battery', measure_battery, channel);
          break;
        case 'tC':
        case 'deviceTemperature':
        case 'temperature':
        case 'temp':
          if (channel < 100) {
            this.updateCapabilityValue('measure_temperature', value, channel);
          } else if (this.getStoreValue('channel') === 0 && channel === 100 && typeof value !== 'object' && this.hasCapability('measure_temperature.1')) {
            if (this.getCapabilityValue('measure_temperature.1') !== value) {
              this.updateCapabilityValue('measure_temperature.1', value, channel);
              this.homey.flow.getDeviceTriggerCard('triggerTemperature1').trigger(this, {'temperature': value}, {}).catch(error => { this.error(error) });
            }
          } else if (this.getStoreValue('channel') === 0 && channel === 101 && typeof value !== 'object' && this.hasCapability('measure_temperature.2')) {
            if (this.getCapabilityValue('measure_temperature.2') !== value) {
              this.updateCapabilityValue('measure_temperature.2', value, channel);
              this.homey.flow.getDeviceTriggerCard('triggerTemperature2').trigger(this, {'temperature': value}, {}).catch(error => { this.error(error) });
            }
          } else if (this.getStoreValue('channel') === 0 && channel === 102 && typeof value !== 'object' && this.hasCapability('measure_temperature.3')) {
            if (this.getCapabilityValue('measure_temperature.3') !== value) {
              this.updateCapabilityValue('measure_temperature.3', value, channel);
              this.homey.flow.getDeviceTriggerCard('triggerTemperature3').trigger(this, {'temperature': value}, {}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'current_C':
          this.updateCapabilityValue('measure_temperature.thermostat', value, channel);
          break;
        case 'targetTemperature':
          let target_temperature = this.util.clamp(value, 5, 30);
          this.updateCapabilityValue('target_temperature', target_temperature, channel);
          break;
        case 'target_C':
          this.updateCapabilityValue('target_temperature', value, channel);
          break;
        case 'valvePosition':
          if (value != this.getCapabilityValue('valve_position')) {
            let valve_position = this.util.clamp(value, 0, 100);
            this.updateCapabilityValue('valve_position', valve_position, channel);
            this.homey.flow.getDeviceTriggerCard('triggerValvePosition').trigger(this, {'position': value}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'rollerState':
          this.rollerState(value);
          break;
        case 'rollerPosition':
        case 'current_pos':
          let windowcoverings_set = this.util.clamp(value, 0, 100) / 100;
          await this.setStoreValue('previous_position', this.getCapabilityValue('windowcoverings_set'));
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
          if (this.getClass() === 'light') {
            let light_mode = value === 'white' ? 'temperature' : 'color';
            this.updateCapabilityValue('light_mode', light_mode, channel);
          } else if (this.getClass() === 'heater') {
            this.updateCapabilityValue('valve_mode', value.toString());
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
          this.updateCapabilityValue('light_temperature', this.util.clamp(light_temperature, 0, 1), channel);
          break;
        case 'whiteLevel':
          let light_temperature_whitelevel = 1 - value / 100;
          this.updateCapabilityValue('light_temperature', this.util.clamp(light_temperature_whitelevel, 0, 1), channel);
          break;
        case 'white':
          let light_temperature_white = 1 - Number(this.util.normalize(value, 0, 255));
          this.updateCapabilityValue('light_temperature', this.util.clamp(light_temperature_white, 0, 1), channel);
          if (value > 220 && !this.getCapabilityValue('onoff.whitemode')) {
            this.updateCapabilityValue('onoff.whitemode', true, channel);
            this.updateCapabilityValue('light_mode', 'temperature', channel);
          } else if (value >= 0 && value <= 220 && this.getCapabilityValue('onoff.whitemode')) {
            this.updateCapabilityValue('onoff.whitemode', false, channel);
            this.updateCapabilityValue('light_mode', 'color', channel);
          }
          break;
        case 'red':
          await this.setStoreValue('red', value);
          this.updateDeviceRgb();
          break;
        case 'green':
          await this.setStoreValue('green', value);
          this.updateDeviceRgb();
          break;
        case 'blue':
          await this.setStoreValue('blue', value);
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
          if (value !== undefined && !isNaN(value) && typeof value == 'number' && value != this.getCapabilityValue('tilt')) {
            this.updateCapabilityValue('tilt', value, channel);
            this.homey.flow.getDeviceTriggerCard('triggerTilt').trigger(this, {'tilt': value}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'illuminance':
        case 'lux':
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
            this.homey.flow.getDeviceTriggerCard('triggerGasConcentration').trigger(this, {'ppm': value}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'smoke':
        case 'alarm_smoke':
          value = value === 1 || value ? true : false;
          this.updateCapabilityValue('alarm_smoke', value, channel);
          break;
        case 'input0':
          if (typeof value == 'number') {
            value = value === 0 ? false : true;
          }
          const input1Triggercard = value ? 'triggerInput1On' : 'triggerInput1Off';
          this.triggerDeviceTriggerCard('input_1', value, channel, input1Triggercard, {}, {});
          this.triggerDeviceTriggerCard('input_1', value, channel, 'triggerInput1Changed', {}, {});
          this.updateCapabilityValue('input_1', value, channel);
          break;
        case 'input1':
          if (typeof value == 'number') {
            value = value === 0 ? false : true;
          }
          if (!this.hasCapability('input_2')) {
            const input2_1Triggercard = value ? 'triggerInput1On' : 'triggerInput1Off';
            this.triggerDeviceTriggerCard('input_1', value, channel, input2_1Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_1', value, channel, 'triggerInput1Changed', {}, {});
            this.updateCapabilityValue('input_1', value, channel);
          } else {
            const input2Triggercard = value ? 'triggerInput2On' : 'triggerInput2Off';
            this.triggerDeviceTriggerCard('input_2', value, channel, input2Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_2', value, channel, 'triggerInput2Changed', {}, {});
            this.updateCapabilityValue('input_2', value, channel);
          }
          break;
        case 'input2':
          if (typeof value == 'number') {
            value = value === 0 ? false : true;
          }
          const input3Triggercard = value ? 'triggerInput3On' : 'triggerInput3Off';
          this.triggerDeviceTriggerCard('input_3', value, channel, input3Triggercard, {}, {});
          this.triggerDeviceTriggerCard('input_3', value, channel, 'triggerInput3Changed', {}, {});
          this.updateCapabilityValue('input_3', value, channel);
          break;
        case 'input3':
          if (typeof value == 'number') {
            value = value === 0 ? false : true;
          }
          const input4Triggercard = value ? 'triggerInput4On' : 'triggerInput4Off';
          this.triggerDeviceTriggerCard('input_4', value, channel, input4Triggercard, {}, {});
          this.triggerDeviceTriggerCard('input_4', value, channel, 'triggerInput4Changed', {}, {});
          this.updateCapabilityValue('input_4', value, channel);
          break;
        case 'inputEvent0':
          if (this.hasCapability('input_1') && this.hasCapability('input_2')) {
            let actionEvent1 = this.util.getActionEventDescription(value, this.getStoreValue('communication'), this.getStoreValue('gen')) + '_1';
            await this.setStoreValue('actionEvent1', actionEvent1);
          } else {
            let actionEvent1 = this.util.getActionEventDescription(value, this.getStoreValue('communication'), this.getStoreValue('gen'));
            await this.setStoreValue('actionEvent', actionEvent1);
          }
          break;
        case 'inputEvent1':
          if (this.hasCapability('input_1') && this.hasCapability('input_2')) {
            let actionEvent2 = this.util.getActionEventDescription(value, this.getStoreValue('communication'), this.getStoreValue('gen')) + '_2';
            await this.setStoreValue('actionEvent2', actionEvent2);
          } else {
            let actionEvent2 = this.util.getActionEventDescription(value, this.getStoreValue('communication'), this.getStoreValue('gen'));
            await this.setStoreValue('actionEvent', actionEvent2);
          }
          break;
        case 'inputEvent2':
          let actionEvent3 = this.util.getActionEventDescription(value, this.getStoreValue('communication'), this.getStoreValue('gen')) + '_3';
          await this.setStoreValue('actionEvent3', actionEvent3);
          break;
        case 'inputEventCounter0':
          if (this.hasCapability('input_1') && this.hasCapability('input_2')) {
            if (value > 0 && (typeof this.getStoreValue('actionEvent1') === 'string' || this.getStoreValue('actionEvent1') instanceof String)) {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.getStoreValue('actionEvent1')}, {"action": this.getStoreValue('actionEvent1')}).catch(error => { this.error(error) });

              // TODO: remove this eventually
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent1')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent1')}).catch(error => { this.error(error) });
            }
          } else {
            if (value > 0 && (typeof this.getStoreValue('actionEvent') === 'string' || this.getStoreValue('actionEvent') instanceof String)) {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.getStoreValue('actionEvent')}, {"action": this.getStoreValue('actionEvent')}).catch(error => { this.error(error) });

              // TODO: remove this eventually
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'inputEventCounter1':
          if (this.hasCapability('input_1') && this.hasCapability('input_2')) {
            if (value > 0 && (typeof this.getStoreValue('actionEvent2') === 'string' || this.getStoreValue('actionEvent2') instanceof String)) {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.getStoreValue('actionEvent2')}, {"action": this.getStoreValue('actionEvent2')}).catch(error => { this.error(error) });

              // TODO: remove this eventually
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent2')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent2')}).catch(error => { this.error(error) });
            }
          } else {
            if (value > 0 && (typeof this.getStoreValue('actionEvent') === 'string' || this.getStoreValue('actionEvent') instanceof String)) {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.getStoreValue('actionEvent')}, {"action": this.getStoreValue('actionEvent')}).catch(error => { this.error(error) });

              // TODO: remove this eventually
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'inputEventCounter2':
          if (value > 0 && (typeof this.getStoreValue('actionEvent3') === 'string' || this.getStoreValue('actionEvent3') instanceof String)) {
            this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.getStoreValue('actionEvent3')}, {"action": this.getStoreValue('actionEvent3')}).catch(error => { this.error(error) });

              // TODO: remove this eventually
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent3')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent3')}).catch(error => { this.error(error) });
          }
          break;
        case 'externalTemperature0':
          if (value != this.getCapabilityValue('measure_temperature.1')) {
            this.updateCapabilityValue('measure_temperature.1', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature1').trigger(this, {'temperature': value}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'externalTemperature1':
          if (value != this.getCapabilityValue('measure_temperature.2')) {
            this.updateCapabilityValue('measure_temperature.2', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature2').trigger(this, {'temperature': value}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'externalTemperature2':
          if (value != this.getCapabilityValue('measure_temperature.3')) {
            this.updateCapabilityValue('measure_temperature.3', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature3').trigger(this, {'temperature': value}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'externalInput0':
          let input_external = value === 0 ? false : true;
          if (input_external != this.getCapabilityValue('input_external')) {
            this.updateCapabilityValue('input_external', input_external, channel);
            if (input_external) {
              this.homey.flow.getDeviceTriggerCard('triggerInputExternal1On').trigger(this, {}, {}).catch(error => { this.error(error) });
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInputExternal1Off').trigger(this, {}, {}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'input100':
          if (value != this.getCapabilityValue('input_external_1')) {
            this.updateCapabilityValue('input_external_1', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal1Changed').trigger(this, {}, {}).catch(error => { this.error(error) });
            if (value) {
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal1On').trigger(this, {}, {}).catch(error => { this.error(error) });
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal1Off').trigger(this, {}, {}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'input101':
          if (value != this.getCapabilityValue('input_external_2')) {
            this.updateCapabilityValue('input_external_2', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal2Changed').trigger(this, {}, {}).catch(error => { this.error(error) });
            if (value) {
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal2On').trigger(this, {}, {}).catch(error => { this.error(error) });
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal2Off').trigger(this, {}, {}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'input102':
          if (value != this.getCapabilityValue('input_external_3')) {
            this.updateCapabilityValue('input_external_3', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal3Changed').trigger(this, {}, {}).catch(error => { this.error(error) });
            if (value) {
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal3On').trigger(this, {}, {}).catch(error => { this.error(error) });
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal3Off').trigger(this, {}, {}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'input103':
          if (value != this.getCapabilityValue('input_external_4')) {
            this.updateCapabilityValue('input_external_4', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal4Changed').trigger(this, {}, {}).catch(error => { this.error(error) });
            if (value) {
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal4On').trigger(this, {}, {}).catch(error => { this.error(error) });
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal4Off').trigger(this, {}, {}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'input104':
          if (value != this.getCapabilityValue('input_external_5')) {
            this.updateCapabilityValue('input_external_5', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal5Changed').trigger(this, {}, {}).catch(error => { this.error(error) });
            if (value) {
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal5On').trigger(this, {}, {}).catch(error => { this.error(error) });
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerPlusInputExternal5Off').trigger(this, {}, {}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'input100_analog':
          if (value != this.getCapabilityValue('input_analog_external_1')) {
            this.updateCapabilityValue('input_analog_external_1', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerPlusInputAnalogExternal1Changed').trigger(this, {'percentage': value}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'input101_analog':
          if (value != this.getCapabilityValue('input_analog_external_2')) {
            this.updateCapabilityValue('input_analog_external_2', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerPlusInputAnalogExternal2Changed').trigger(this, {'percentage': value}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'input102_analog':
          if (value != this.getCapabilityValue('input_analog_external_3')) {
            this.updateCapabilityValue('input_analog_external_3', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerPlusInputAnalogExternal3Changed').trigger(this, {'percentage': value}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'input103_analog':
          if (value != this.getCapabilityValue('input_analog_external_4')) {
            this.updateCapabilityValue('input_analog_external_4', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerPlusInputAnalogExternal4Changed').trigger(this, {'percentage': value}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'input104_analog':
          if (value != this.getCapabilityValue('input_analog_external_5')) {
            this.updateCapabilityValue('input_analog_external_5', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerPlusInputAnalogExternal5Changed').trigger(this, {'percentage': value}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'input_pulse_counts_total':
          if (value != this.getCapabilityValue('input_pulse_counts_total')) {
            this.updateCapabilityValue('input_pulse_counts_total', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerInputCountsTotal').trigger(this, {'pulse': value}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'input_pulse_counts_minute':
          if (value != this.getCapabilityValue('input_pulse_counts_minute')) {
            this.updateCapabilityValue('input_pulse_counts_minute', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerInputCountsMinute').trigger(this, {'pulse': value}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'humidity':
        case 'externalHumidity':
        case 'rh':
          if (channel < 100) {
            this.updateCapabilityValue('measure_humidity', value, channel);
          } else if (this.getStoreValue('channel') === 0 && channel === 100) {
            if (this.getCapabilityValue('measure_humidity.1') !== value) {
              this.updateCapabilityValue('measure_humidity.1', value, channel);
              this.homey.flow.getDeviceTriggerCard('triggerHumidity1').trigger(this, {'humidity': value}, {}).catch(error => { this.error(error) });
            }
          } else if (this.getStoreValue('channel') === 0 && channel === 101) {
            if (this.getCapabilityValue('measure_humidity.2') !== value) {
              this.updateCapabilityValue('measure_humidity.2', value, channel);
              this.homey.flow.getDeviceTriggerCard('triggerHumidity2').trigger(this, {'humidity': value}, {}).catch(error => { this.error(error) });
            }
          } else if (this.getStoreValue('channel') === 0 && channel === 102) {
            if (this.getCapabilityValue('measure_humidity.3') !== value) {
              this.updateCapabilityValue('measure_humidity.3', value, channel);
              this.homey.flow.getDeviceTriggerCard('triggerHumidity3').trigger(this, {'humidity': value}, {}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'rollerStopReason':
        case 'wakeUpEvent':
          break;
        default:
          //this.log('Device does not support reported capability '+ capability +' with value '+ value);
          break;
      }
      return Promise.resolve(true);
    } catch(error) {
      this.error(error);
    }
  }

  updateDeviceRgb() {
    try {
      clearTimeout(this.updateDeviceRgbTimeout);
      this.updateDeviceRgbTimeout = this.homey.setTimeout(() => {
        try {
          let color = tinycolor({ r: this.getStoreValue('red'), g: this.getStoreValue('green'), b: this.getStoreValue('blue') });
          let hsv = color.toHsv();
          let light_hue = Number((hsv.h / 360).toFixed(2));
          this.updateCapabilityValue('light_hue', light_hue, this.getStoreValue('channel'));
          this.updateCapabilityValue('light_saturation', hsv.v, this.getStoreValue('channel'));
        } catch (error) {
          this.error(error);
        }
      }, 2000);
    } catch (error) {
      this.error(error);
    }
  }

  async rollerState(value) {
    try {
      var windowcoverings_state = this.getCapabilityValue('windowcoverings_state');
      switch(value) {
        case 'stop':
        case 'stopped':
          windowcoverings_state = 'idle'
          break;
        case 'open':
        case 'opening':
          windowcoverings_state = 'up';
          break;
        case 'close':
        case 'closed':
        case 'closing':
          windowcoverings_state = 'down';
          break;
        default:
          break;
      }
      if (windowcoverings_state !== 'idle' && windowcoverings_state !== this.getStoreValue('last_action')) {
        await this.setStoreValue('last_action', windowcoverings_state);
      }
      this.updateCapabilityValue('windowcoverings_state', windowcoverings_state, this.getStoreValue('channel'));
    } catch (error) {
      this.error(error);
    }
  }

  getCommandId() {
    return this.commandId++
  }

  async updateDeviceConfig() {
    try {

      /* placeholder for update for specific devices */

      // TODO: remove after next release
      if ((this.getStoreValue('type') === '001PCEU16' || this.getStoreValue('type') === 'SNSW-001P8EU') && this.hasCapability('meter_power.total_returned')) {
        this.removeCapability('meter_power.total_returned');
      }

      /* COAP AND WEBSOCKET */
      if (this.getStoreValue('communication') === 'coap' || this.getStoreValue('communication') === 'websocket') {

        /* get the current device config */
        let device_config = this.util.getDeviceConfig(this.getStoreValue('config').hostname[0]);

        /* for non-battery operated devices retrieve the actual status */
        if (!this.getStoreValue('battery')) {

          /* retrieve the status */
          let result;
          let config;

          if (this.getStoreValue('communication') === 'coap') {
            result = await this.util.sendCommand('/settings', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
          } else if (this.getStoreValue('communication') === 'websocket') {
            result = await this.util.sendRPCCommand('/rpc/Shelly.GetDeviceInfo', this.getSetting('address'), this.getSetting('password'));
            config = await this.util.sendRPCCommand('/rpc/Shelly.GetConfig', this.getSetting('address'), this.getSetting('password'));
          }

          /* we have a device config and a status result ... */
          if (typeof device_config !== 'undefined' && result) {

            /* update device store values */
            if (this.getStoreValue('communication') === 'coap') {
              const regex = /(?<=\/v)(.*?)(?=\-)/gm;
              const version_data = regex.exec(result.fw);
              if (version_data !== null) {
                await this.setStoreValue('fw_version', version_data[0]);
              }
              await this.setStoreValue('type', result.device.type);
              await this.setStoreValue('device_settings', result);
            } else if (this.getStoreValue('communication') === 'websocket') {
              await this.setStoreValue('type', result.model);
              await this.setStoreValue('fw_version', result.ver);
              await this.setStoreValue('device_settings', config);
            }

          } else {
            return Promise.reject(this.getData().id + ' has no valid device config and/or was not able to return its status upon init ...');
          }

        }

        if (typeof device_config !== 'undefined') {

          /* updating device config store value */
          await this.setStoreValue('config', device_config);

          /* add any missing capabilities to the device based on device config */
          if (this.getStoreValue('channel') === 0) {
            device_config.capabilities_1.forEach(async (capability) => {
              if(!this.hasCapability(capability)) {
                this.log('Adding capability', capability, 'to', this.getData().id, 'upon device init as the device does not have it already but its added in the device config.');
                await this.addCapability(capability).catch(this.error);
              }
            });
          } else {
            device_config.capabilities_2.forEach(async (capability) => {
              if(!this.hasCapability(capability)) {
                this.log('Adding capability', capability, 'to', this.getData().id, 'upon device init as the device does not have it already but its added in the device config.');
                await this.addCapability(capability).catch(this.error);
              }
            });
          }

          /* set device class if changed */
          if (this.getClass() !== device_config.class) {
            this.log('Updating device class from', this.getClass(), 'to', device_config.class);
            this.setClass(device_config.class)
          }

          /* update device capability options */
          if (Object.keys(device_config.capability_options).length > 0) {
            for (const key in device_config.capability_options) {
              if (this.hasCapability(key)) {
                try {
                  const capability_option = await this.getCapabilityOptions(key);
                  if (JSON.stringify(capability_option) !== JSON.stringify(device_config.capability_options[key])) {
                    this.log('Updating capability option', key, 'with', JSON.stringify(device_config.capability_options[key]));
                    await this.setCapabilityOptions(key, device_config.capability_options[key]);
                  }
                } catch (error) {
                  if (error.message.includes('Invalid Capability')) {
                    this.log('Adding capability option', key, 'with', JSON.stringify(device_config.capability_options[key]));
                    await this.setCapabilityOptions(key, device_config.capability_options[key]);
                  } else {
                    this.error(error);
                  }
                }
              }
            }
          }

        } else {
          return Promise.reject(this.getData().id + ' has no valid device config ...');
        }

        return Promise.resolve(true);

      /* BLUETOOTH DEVICES */
      } else if (this.getStoreValue('communication') === 'bluetooth') {

        let device_config = this.util.getDeviceConfig('type', this.getStoreValue('type'));

        if (typeof device_config !== 'undefined') {

          /* updating device config store value */
          await this.setStoreValue('config', device_config);

          /* add any missing capabilities to the device based on device config */
          device_config.capabilities_1.forEach(async (capability) => {
            if(!this.hasCapability(capability)) {
              this.log('Adding capability', capability, 'to', this.getData().id, 'upon device init as the device does not have it already but its added in the device config.');
              await this.addCapability(capability).catch(this.error);
            }
          });

          /* set device class if changed */
          if (this.getClass() !== device_config.class) {
            this.log('Updating device class from', this.getClass(), 'to', device_config.class);
            this.setClass(device_config.class)
          }

        } else {
          return Promise.reject(this.getData().id + ' has no valid device config to set');
        }

      /* CLOUD DEVICES */
      } else if (this.getStoreValue('communication') === 'cloud') {
        
        let device_config = this.util.getDeviceConfig(this.getStoreValue('config').hostname[0]);

        if (typeof device_config !== 'undefined') {

          /* update the communication config to cloud */
          device_config.communication = 'cloud';

          /* updating device config store value */
          await this.setStoreValue('config', device_config);

          /* add any missing capabilities to the device based on device config */
          if (this.getStoreValue('channel') === 0) {
            device_config.capabilities_1.forEach(async (capability) => {
              if(!this.hasCapability(capability)) {
                this.log('Adding capability', capability, 'to', this.getData().id, 'upon device init as the device does not have it already but its added in the device config.');
                await this.addCapability(capability).catch(this.error);
              }
            });
          } else {
            device_config.capabilities_2.forEach(async (capability) => {
              if(!this.hasCapability(capability)) {
                this.log('Adding capability', capability, 'to', this.getData().id, 'upon device init as the device does not have it already but its added in the device config.');
                await this.addCapability(capability).catch(this.error);
              }
            });
          }

          /* set device class if changed */
          if (this.getClass() !== device_config.class) {
            this.log('Updating device class from', this.getClass(), 'to', device_config.class);
            this.setClass(device_config.class)
          }

          /* update device capability options */
          if (Object.keys(device_config.capability_options).length > 0) {
            for (const key in device_config.capability_options) {
              if (this.hasCapability(key)) {
                try {
                  const capability_option = await this.getCapabilityOptions(key);
                  if (JSON.stringify(capability_option) !== JSON.stringify(device_config.capability_options[key])) {
                    this.log('Updating capability option', key, 'with', JSON.stringify(device_config.capability_options[key]));
                    await this.setCapabilityOptions(key, device_config.capability_options[key]);
                  }
                } catch (error) {
                  if (error.message.includes('Invalid Capability')) {
                    this.log('Adding capability option', key, 'with', JSON.stringify(device_config.capability_options[key]));
                    await this.setCapabilityOptions(key, device_config.capability_options[key]);
                  } else {
                    this.error(error);
                  }
                }
              }
            }
          }

        } else {
          return Promise.reject(this.getData().id + ' has no valid device config to set');
        }

      } else {
        return Promise.resolve(true);
      }
       
    } catch (error) {
      this.error(error);
    }
  }

}

module.exports = ShellyDevice;