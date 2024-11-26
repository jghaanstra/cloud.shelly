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
      this.bluetoothScriptVersion = 6;
      this.pollingFailures = 0;
    
      // ADDING CAPABILITY LISTENERS
      this.registerMultipleCapabilityListener(["onoff", "onoff.light"], this.onMultipleCapabilityOnoff.bind(this));
      this.registerCapabilityListener("onoff.1", this.onCapabilityOnoff1.bind(this));
      this.registerCapabilityListener("onoff.2", this.onCapabilityOnoff2.bind(this));
      this.registerCapabilityListener("onoff.3", this.onCapabilityOnoff3.bind(this));
      this.registerCapabilityListener("onoff.4", this.onCapabilityOnoff4.bind(this));
      this.registerCapabilityListener("onoff.5", this.onCapabilityOnoff5.bind(this));
      this.registerMultipleCapabilityListener(["dim", "dim.light"], this.onMultipleCapabilityDim.bind(this));
      this.registerCapabilityListener("dim.white", this.onCapabilityDimWhite.bind(this));
      this.registerCapabilityListener("light_temperature", this.onCapabilityLightTemperature.bind(this));
      this.registerMultipleCapabilityListener(['light_hue', 'light_saturation'], this.onMultipleCapabilityListenerSatHue.bind(this), 500);
      this.registerCapabilityListener("light_mode", this.onCapabilityLightMode.bind(this));
      this.registerCapabilityListener("onoff.whitemode", this.onCapabilityOnoffWhiteMode.bind(this));
      this.registerCapabilityListener("windowcoverings_state", this.onCapabilityWindowcoveringsState.bind(this));
      this.registerCapabilityListener("windowcoverings_set", this.onCapabilityWindowcoveringsSet.bind(this));
      this.registerCapabilityListener("windowcoverings_tilt_set", this.onCapabilityWindowcoveringsTiltSet.bind(this));
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
      if (!this.getStoreValue('battery') && this.getStoreValue('channel') === 0 && (this.getStoreValue('communication') === 'coap' || this.getStoreValue('communication') === 'websocket') || this.getStoreValue('communication') === 'gateway') {
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
      if ((this.getStoreValue('communication') === 'websocket' || this.getStoreValue('communication') === 'gateway') && this.getStoreValue('wsserver')) {
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
      if (!this.getStoreValue('battery') && this.getStoreValue('channel') === 0 && (this.getStoreValue('communication') === 'coap' || this.getStoreValue('communication') === 'websocket') || this.getStoreValue('communication') === 'gateway') {
        this.pollingInterval = this.homey.setInterval(() => {
          this.pollDevice();
        }, (60000 + this.util.getRandomTimeout(20)));
      }

      // validate communication configuration
      if (!this.getStoreValue('battery') && this.getStoreValue('channel') === 0 && this.getStoreValue('communication') === 'coap') {
        const homey_ip = await this.homey.cloud.getLocalAddress();
        if (this.getStoreValue('device_settings').hasOwnProperty("coiot")) {
          if (this.getStoreValue('device_settings').coiot.enabled === false || (this.getStoreValue('device_settings').coiot.enabled === true && !this.getStoreValue('device_settings').coiot.peer.includes(homey_ip.substring(0, homey_ip.length-3)) && this.getStoreValue('device_settings').coiot.peer !== "")) {
            await this.util.setUnicast(this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
          }
        }
      } else if (!this.getStoreValue('battery') && this.getStoreValue('channel') === 0 && (this.getStoreValue('communication') === 'websocket' || this.getStoreValue('communication') === 'gateway')) {
        const homey_ip = await this.homey.cloud.getLocalAddress();
        if (this.getStoreValue('device_settings').hasOwnProperty("ws")) {
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

  /* onoff & onoff.light */
  async onMultipleCapabilityOnoff(valueObj, optsObj) {
    try {
      switch(this.getStoreValue('communication')) {
        case 'websocket': {
          let value;
          let component = this.getStoreValue('config').extra.component;
          if (typeof valueObj.onoff !== 'undefined') {
            value = valueObj.onoff;
          } else if (typeof valueObj["onoff.light"] !== 'undefined') {
            value = valueObj["onoff.light"];
            if (this.getStoreValue('config').id === 'shellyprorgbwwpm-rgbcct') {
              component = 'CCT'
            } else if (this.getStoreValue('config').id === 'shellyprorgbwwpm-rgbx2light') {
              component = 'Light'
            }
          }
          return await this.util.sendRPCCommand('/rpc/'+ component +'.Set?id='+ this.getStoreValue('channel') +'&on='+ value, this.getSetting('address'), this.getSetting('password'));
        }
        case 'coap': {
          const command = valueObj.onoff ? '/'+ this.getStoreValue('config').extra.component +'/'+ this.getStoreValue('channel') +'?turn=on' : '/'+ this.getStoreValue('config').extra.component +'/'+ this.getStoreValue('channel') +'?turn=off';
          return await this.util.sendCommand(command, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        }
        case 'cloud': {
          const component_cloud = this.getClass() === 'light' ? 'light' : 'relay';
          const onoff = valueObj.onoff ? 'on' : 'off';
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
              return await this.util.sendRPCCommand('/rpc/Cover.Stop?id='+ this.getStoreValue('channel'), this.getSetting('address'), this.getSetting('password'));
            case 'up':
              return await this.util.sendRPCCommand('/rpc/Cover.Open?id='+ this.getStoreValue('channel'), this.getSetting('address'), this.getSetting('password'));
            case 'down':
              return await this.util.sendRPCCommand('/rpc/Cover.Close?id='+ this.getStoreValue('channel'), this.getSetting('address'), this.getSetting('password'));
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
          return await this.util.sendRPCCommand('/rpc/Cover.GoToPosition?id='+ this.getStoreValue('channel') +'&pos='+ Math.round(value*100), this.getSetting('address'), this.getSetting('password'));
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

  /* windowcoverings_state */
  async onCapabilityWindowcoveringsTiltSet(value, opts) {
    try {
      switch(this.getStoreValue('communication')) {
        case 'websocket': {
          return await this.util.sendRPCCommand('/rpc/Cover.GoToPosition?id='+ this.getStoreValue('channel') +'&slat_pos='+ Math.round(value*100), this.getSetting('address'), this.getSetting('password'));
        }
        case 'cloud': {
          return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'roller_to_pos', command_param: 'slat_pos', command_value: Math.round(value*100), deviceid: String(this.getSetting('cloud_device_id')), channel: this.getStoreValue('channel')})]);
        }
        default:
          break;
      }
    } catch (error) {
      this.error(error);
    }
  }

  /* dim & dim.light */
  async onMultipleCapabilityDim(valueObj, optsObj) {
    try {
      let dim_duration = 500;
      if (optsObj.hasOwnProperty("dim")) {
        if (optsObj.dim.duration !== undefined || typeof optsObj.dim.duration !== 'undefined') {
          dim_duration = optsObj.dim.duration;
        }
      } else if (optsObj.hasOwnProperty("dim.light")) {
        if (optsObj["dim.light"].duration !== undefined || typeof optsObj["dim.light"].duration !== 'undefined') {
          dim_duration = optsObj["dim.light"].duration;
        }
      }
      
      if (dim_duration > 5000 ) {
        return Promise.reject(this.homey.__('device.maximum_dim_duration'));
      } else {
        let dim_component = this.getStoreValue('config').extra.dim;

        /* dim gain or brightness depending on light_mode for Shelly Bulb (RGBW) */
        if (this.getStoreValue('config').id === 'shellybulb' || this.getStoreValue('config').id === 'shellycolorbulb') {
          if (this.getCapabilityValue('light_mode') === 'color') {
            dim_component = 'gain';
          }
        }

        switch(this.getStoreValue('communication')) {
          case 'websocket': {
            if (typeof valueObj.dim !== 'undefined' ) {
              const onoff_websocket = valueObj.dim === 0 ? false : true;
              const dim_websocket = valueObj.dim === 0 ? 1 : valueObj.dim * 100;
              return await this.util.sendRPCCommand('/rpc/'+ this.getStoreValue('config').extra.component +'.Set?id='+ this.getStoreValue('channel') +'&on='+ onoff_websocket +'&'+ this.getStoreValue('config').extra.dim +'='+ dim_websocket +'&transition_duration='+ dim_duration / 1000, this.getSetting('address'), this.getSetting('password'));
            } else if (typeof valueObj["dim.light"] !== 'undefined' ) {
              const onoff_websocket = valueObj["dim.light"] === 0 ? false : true;
              const dim_websocket = valueObj["dim.light"] === 0 ? 1 : valueObj["dim.light"] * 100;
              const component = this.getStoreValue('config').id === 'shellyprorgbwwpm-rgbcct' ? 'CCT' : 'Light';
              return await this.util.sendRPCCommand('/rpc/'+ component +'.Set?id='+ this.getStoreValue('channel') +'&on='+ onoff_websocket +'&'+ this.getStoreValue('config').extra.dim +'='+ dim_websocket +'&transition_duration='+ dim_duration / 1000, this.getSetting('address'), this.getSetting('password'));
            }
          }
          case 'coap': {
            const dim_coap = valueObj.dim === 0 ? 1 : valueObj.dim * 100;
            const onoff_coap = valueObj.dim === 0 ? 'off' : 'on';
            if (!this.getCapabilityValue('onoff')) {
              return await this.util.sendCommand('/'+ this.getStoreValue('config').extra.component +'/'+ this.getStoreValue('channel') +'?turn='+ onoff_coap +'&'+ dim_component +'='+ dim_coap +'&transition='+ dim_duration +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
            } else {
              return await this.util.sendCommand('/'+ this.getStoreValue('config').extra.component +'/'+ this.getStoreValue('channel') +'?'+ dim_component +'='+ dim_coap +'&transition='+ dim_duration +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
            }
          }
          case 'cloud': {
            if (!this.getCapabilityValue('onoff') && valueObj.dim !== 0) {
              this.updateCapabilityValue('onoff', true, this.getStoreValue('channel'));
            } else if (this.getCapabilityValue('onoff') && valueObj.dim === 0) {
              this.updateCapabilityValue('onoff', false, this.getStoreValue('channel'));
            }
            const dim_cloud = valueObj.dim === 0 ? 1 : valueObj.dim * 100;
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

  /* dim.white*/
  async onCapabilityDimWhite(value, opts) {
    try {
      if (opts.duration === undefined || typeof opts.duration == 'undefined') {
        opts.duration = 500;
      }
      if (opts.duration > 5000 ) {
        return Promise.reject(this.homey.__('device.maximum_dim_duration'));
      } else {
        const white = Number(this.util.denormalize(value , 0, 255));

        if (white > 0.5 && !this.getCapabilityValue('onoff.whitemode')) {
          this.updateCapabilityValue('onoff.whitemode', true);
        } else if (white <= 0.5 && this.getCapabilityValue('onoff.whitemode')) {
          this.updateCapabilityValue('onoff.whitemode', false);
        }

        switch(this.getStoreValue('communication')) {
          case 'websocket': {
            return await this.util.sendRPCCommand('/rpc/'+ this.getStoreValue('config').extra.component +'.Set?id='+ this.getStoreValue('channel') +'&white='+ white +'&transition_duration='+ opts.duration / 1000, this.getSetting('address'), this.getSetting('password'));
          }
          case 'coap': {
            return await this.util.sendCommand('/'+ this.getStoreValue('config').extra.component +'/'+ this.getStoreValue('channel') +'?white='+ white, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
          }
          case 'cloud': {
            return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', command_param: 'white', command_value: white, deviceid: String(this.getSetting('cloud_device_id')), channel: this.getStoreValue('channel')})]);
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
          if (this.getStoreValue('config').id === 'shellyprorgbwwpm-rgbcct' || this.getStoreValue('config').id === 'shellyprorgbwwpm-cctx2') {
            const light_temperature = Number(this.util.denormalize((1 - value), 2700, 6500));
            return await this.util.sendRPCCommand('/rpc/CCT.Set?id='+ this.getStoreValue('channel') +'&ct='+ light_temperature, this.getSetting('address'), this.getSetting('password'));
          } else {
            break;
          }
        }
        case 'coap': {
          /* update light_mode if available */
          if (this.hasCapability('light_mode')) {
            this.triggerCapabilityListener('light_mode', 'temperature');
          }

          /* set light_temperature depending of device model */
          if (this.getStoreValue('config').id === 'shellybulbduo') {
            const duo_white = 100 - (value * 100);
            return await this.util.sendCommand('/light/0?white='+ duo_white +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
          } else if (this.getStoreValue('config').id === 'shellybulb' || this.getStoreValue('config').id === 'shellycolorbulb') {
            const light_temperature = Number(this.util.denormalize((1 - value), 3000, 6500)); // the 1 - value is a backwards compatible hack as the denormalize function has been initially wrong but people might have configured it like that in their flows
            return await this.util.sendCommand('/light/0?temp='+ light_temperature +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
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
      const hue_value = typeof valueObj.light_hue !== 'undefined' ? valueObj.light_hue : this.getCapabilityValue('light_hue');
      const saturation_value = typeof valueObj.light_saturation !== 'undefined' ? valueObj.light_saturation : this.getCapabilityValue('light_saturation');
      const color = tinycolor.fromRatio({ h: hue_value, s: saturation_value, v: this.getCapabilityValue('dim') });
      switch(this.getStoreValue('communication')) {
        case 'websocket': {
          const rgb_values = color.toRgb();
          return await this.util.sendRPCCommand('/rpc/'+ this.getStoreValue('config').extra.component +'.Set?id='+ this.getStoreValue('channel') +'&rgb=['+ Number(rgb_values.r) +','+ Number(rgb_values.g) +','+ Number(rgb_values.b) +']', this.getSetting('address'), this.getSetting('password'));
        }
        case 'coap': {
          if (this.hasCapability('light_mode')) {
            if (this.getCapabilityValue('light_mode') !== 'color') {
              await this.triggerCapabilityListener('light_mode', 'color');
            }
          }
          const rgb_values = color.toRgb();
          return await this.util.sendCommand('/'+ this.getStoreValue('config').extra.component +'/'+ this.getStoreValue('channel') +'?red='+ Number(rgb_values.r) +'&green='+ Number(rgb_values.g) +'&blue='+ Number(rgb_values.b) +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        }
        case 'cloud': {
          if (this.hasCapability('light_mode')) {
            if (this.getCapabilityValue('light_mode') !== 'color') {
              await this.updateCapabilityValue('light_mode', 'color', this.getStoreValue('channel'));
            }
          }
          const rgb_values = color.toRgb();
          return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest-RGB', command: 'light', command_param: 'rbg', red: Number(rgb_values.r), green: Number(rgb_values.g), blue: Number(rgb_values.b), deviceid: String(this.getSetting('cloud_device_id')), channel: this.getStoreValue('channel')})]);
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
          if (this.getStoreValue('config').id === 'shellybulb' || this.getStoreValue('config').id === 'shellycolorbulb') {
            const light_mode = value === 'temperature' ? 'white' : 'color';
            return await this.util.sendCommand('/light/0?mode='+ light_mode +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
          } else {
            return;
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
      switch(this.getStoreValue('communication')) {
        case 'websocket': {
          const white = value ? 255 : 0;
          return await this.util.sendRPCCommand('/rpc/'+ this.getStoreValue('config').extra.component +'.Set?id='+ this.getStoreValue('channel') +'&white='+ white, this.getSetting('address'), this.getSetting('password'));
        }
        case 'coap': {
          const white = value ? 255 : 0;
          return await this.util.sendCommand('/'+ this.getStoreValue('config').extra.component +'/'+ this.getStoreValue('channel') +'?gain=0&white='+ white, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        }
        case 'cloud': {
          const white = value ? 255 : 0;
          return await this.homey.app.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'light', command_param: 'white', command_value: white, deviceid: String(this.getSetting('cloud_device_id')), channel: this.getStoreValue('channel')})]);
        }
        default:
          break;
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
        case 'gateway':{
          return await this.util.sendRPCCommand('/rpc/'+ this.getStoreValue('config').extra.component +'.Call?id='+ this.getStoreValue('componentid') +'&method=TRV.SetPosition&params={"id":0,"pos":'+ value +'}', this.getSetting('address'), this.getSetting('password'));
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
          return await this.util.sendRPCCommand('/rpc/Thermostat.Set?id='+ this.getStoreValue('channel') +'&target_C='+ value, this.getSetting('address'), this.getSetting('password'));
        }
        case 'gateway':{
          return await this.util.sendRPCCommand('/rpc/'+ this.getStoreValue('config').extra.component +'.Call?id='+ this.getStoreValue('componentid') +'&method=TRV.SetTarget&params={"id":0,"target_C":'+ value +'}', this.getSetting('address'), this.getSetting('password'));
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
      const scriptID = await this.util.enableBLEProxy(this.getSetting('address'), this.getSetting('password'));
      await this.setStoreValue('ble_script_version', this.bluetoothScriptVersion);
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
          this.addCapability(capability).catch((error) => { this.error(error) });
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
            device.addCapability(capability).catch((error) => { this.error(error) });
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
      } else if (this.getStoreValue('communication') === 'gateway') {
        result = await this.util.sendRPCCommand('/rpc/'+ this.getStoreValue('config').extra.component +'.GetRemoteStatus?id='+ this.getStoreValue('componentid'), this.getSetting('address'), this.getSetting('password'));
        this.parseFullStatusUpdateGen2(result.status);
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

      this.setAvailability(false, error);
      
      /* stop polling on devices that are unreachable over REST after 10 failures */
      this.pollingFailures++;
      if (this.pollingFailures >= 10) {
        this.error('Killing polling for device', this.getName(), 'with IP', this.getSetting('address'), 'of type', this.getStoreValue('type'), 'due to 10 polling failures' );
        this.homey.clearInterval(this.pollingInterval);

        /* make the device available again to avoid users from complaining about the app (read Homey) not being able to access their Shelly */
        this.setAvailability(true);
      }
      
    }
  }

  /* generic full status parser for polling over HTTP and cloud status updates for gen1 */
  async parseFullStatusUpdateGen1(result = {}) {
    try {
      this.setAvailability(true);

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
            if (light_mode !== this.getCapabilityValue('light_mode')) {
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

            /* dim and dim.white in color mode */
            if (result.lights[channel].mode === 'color') {
              let dim_rgbw2color = result.lights[channel].gain > 100 ? 1 : result.lights[channel].gain / 100;
              this.updateCapabilityValue('dim', dim_rgbw2color, channel);

              let dim_white_rgbw2 = Number(this.util.normalize(result.lights[channel].white, 0, 255));
              this.updateCapabilityValue('dim.white', this.util.clamp(dim_white_rgbw2, 0, 1), channel);

              if (dim_white_rgbw2 > 0.5 && !this.getCapabilityValue('onoff.whitemode')) {
                this.updateCapabilityValue('onoff.whitemode', true, channel);
              } else if (dim_white_rgbw2 <= 0.5 && this.getCapabilityValue('onoff.whitemode')) {
                this.updateCapabilityValue('onoff.whitemode', false, channel);
              }
            }

            /* dim in white mode */
            if (result.lights[channel].mode === 'white') {
              let dim_rgbw2_white = result.lights[channel].brightness > 100 ? 1 : result.lights[channel].brightness / 100;
              this.updateCapabilityValue('dim', dim_rgbw2_white, channel);
            }

          }

          /* light_hue & light_saturation */
          if (this.hasCapability('light_hue') && this.hasCapability('light_saturation')) {
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

      // GAS (alarm_gas, gas_concentration)
      if (result.hasOwnProperty("gas_sensor") && this.hasCapability('alarm_gas')) {

        /* alarm_gas */
        if (result.gas_sensor.alarm_state == 'mild' || result.gas_sensor.alarm_state == 'heavy') {
          var alarm_gas = true;
        } else {
          var alarm_gas = false;
        }
        this.updateCapabilityValue('alarm_gas', alarm_gas, channel);

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

            // TODO: remove this eventually as this card is deprecated but probably still in use
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action0 }, {"id": this.getData().id, "device": this.getName(), "action": action0 }).catch(error => { this.error(error) });
          } else if (this.getStoreValue('event_cnt') === null) {
            await this.setStoreValue('event_cnt', result.inputs[0].event_cnt);
          }
        }

        /* input_2 */
        if (result.inputs.hasOwnProperty([1]) && this.hasCapability('input_2')) {
          let input_2 = result.inputs[1].input == 1 ? true : false;
          const input2Triggercard = input_2 ? 'triggerInput2On' : 'triggerInput2Off';
          this.updateCapabilityValue('input_2', input_2, channel);
          this.triggerDeviceTriggerCard('input_2', input_2, 0, input2Triggercard, {}, {});
          this.triggerDeviceTriggerCard('input_2', input_2, 0, 'triggerInput2Changed', {}, {});

          // action events for gen1 cloud devices
          if (this.getStoreValue('communication') === 'cloud' && this.getStoreValue('event_cnt') !== null && result.inputs[1].event_cnt > 0 && result.inputs[1].event_cnt > this.getStoreValue('event_cnt') && result.inputs[1].event) {
            var action1 = this.util.getActionEventDescription(result.inputs[1].event, 'cloud', 'gen1') + '_2';
            await this.setStoreValue('event_cnt', result.inputs[1].event_cnt);
            this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action1}, {"action": action1}).catch(error => { this.error(error) });

            // TODO: remove this eventually as this card is deprecated but probably still in use
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action1 }, {"id": this.getData().id, "device": this.getName(), "action": action1 }).catch(error => { this.error(error) });
          } else if (this.getStoreValue('event_cnt') === null) {
            this.setStoreValue('event_cnt', result.inputs[1].event_cnt);
          }
        } else if (result.inputs.hasOwnProperty([1]) && this.hasCapability('input_1') && this.getStoreValue('channel') === 1) {
            let input_2_1 = result.inputs[1].input == 1 ? true : false;
            const input2_1Triggercard = input_2_1 ? 'triggerInput1On' : 'triggerInput1Off';
            this.updateCapabilityValue('input_1', input_2_1, channel);
            this.triggerDeviceTriggerCard('input_1', input_2_1, 1, input2_1Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_1', input_2_1, 1, 'triggerInput1Changed', {}, {});

          // action events for gen1 cloud devices
          if (this.getStoreValue('communication') === 'cloud' && this.getStoreValue('event_cnt') !== null && result.inputs[1].event_cnt > 0 && result.inputs[1].event_cnt > this.getStoreValue('event_cnt') && result.inputs[1].event) {
            var action1 = this.util.getActionEventDescription(result.inputs[1].event, 'cloud', 'gen1');
            await this.setStoreValue('event_cnt', result.inputs[1].event_cnt);
            this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action1}, {"action": action1}).catch(error => { this.error(error) });

            // TODO: remove this eventually as this card is deprecated but probably still in use
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action1 }, {"id": this.getData().id, "device": this.getName(), "action": action1 }).catch(error => { this.error(error) });
          } else if (this.getStoreValue('event_cnt') === null) {
            await this.setStoreValue('event_cnt', result.inputs[0].event_cnt);
          }
        }

        /* input_3 */
        if (result.inputs.hasOwnProperty([2]) && this.hasCapability('input_3')) {
          let input_3 = result.inputs[2].input == 1 ? true : false;
          const input3Triggercard = input_3 ? 'triggerInput3On' : 'triggerInput3Off';
          this.updateCapabilityValue('input_3', input_3, channel);
          this.triggerDeviceTriggerCard('input_3', input_3, 2, input3Triggercard, {}, {});
          this.triggerDeviceTriggerCard('input_3', input_3, 2, 'triggerInput3Changed', {}, {});

          // input/action events for cloud devices
          if (this.getStoreValue('communication') === 'cloud' && this.getStoreValue('event_cnt') !== null && result.inputs[2].event_cnt > 0 && result.inputs[2].event_cnt > this.getStoreValue('event_cnt') && result.inputs[2].event) {
            const action2 = this.util.getActionEventDescription(result.inputs[2].event, 'cloud', 'gen1') + '_3';
            this.setStoreValue('event_cnt', result.inputs[2].event_cnt);
            this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action2}, {"action": action2}).catch(error => { this.error(error) });

            // TODO: remove this eventually as this card is deprecated but probably still in use
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action2 }, {"id": this.getData().id, "device": this.getName(), "action": action2 }).catch(error => { this.error(error) });
          } else if (this.getStoreValue('event_cnt') === null) {
            this.setStoreValue('event_cnt', result.inputs[2].event_cnt);
          }
        }

        /* input_4 */
        if (result.inputs.hasOwnProperty([3]) && this.hasCapability('input_4')) {
          let input_4 = result.inputs[3].input == 1 ? true : false;
          const input4Triggercard = input_4 ? 'triggerInput4On' : 'triggerInput4Off';
          this.updateCapabilityValue('input_4', input_4, channel);
          this.triggerDeviceTriggerCard('input_4', input_4, 3, input4Triggercard, {}, {});
          this.triggerDeviceTriggerCard('input_4', input_4, 3, 'triggerInput4Changed', {}, {});

          // input/action events for cloud devices
          if (this.getStoreValue('communication') === 'cloud' && this.getStoreValue('event_cnt') !== null && result.inputs[3].event_cnt > 0 && result.inputs[3].event_cnt > this.getStoreValue('event_cnt') && result.inputs[3].event) {
            const action3 = this.util.getActionEventDescription(result.inputs[3].event, 'cloud', 'gen1') + '_4';
            await this.setStoreValue('event_cnt', result.inputs[3].event_cnt);
            this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action3}, {"action": action3}).catch(error => { this.error(error) });

            // TODO: remove this eventually as this card is deprecated but probably still in use
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action3 }, {"id": this.getData().id, "device": this.getName(), "action": action3 }).catch(error => { this.error(error) });
          } else if (this.getStoreValue('event_cnt') === null) {
            await this.setStoreValue('event_cnt', result.inputs[3].event_cnt);
          }
        }

      }

      // EXT_TEMPERATURE (measure_temperature.1, measure_temperature.2, measure_temperature.3, measure_temperature.4)
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

        /* measure_temperature.4 */
        if (result.ext_temperature.hasOwnProperty([3]) && !this.hasCapability('measure_temperature.4')) {
          this.addCapability('measure_temperature.4');
        } else if (result.ext_temperature.hasOwnProperty([3]) && this.hasCapability('measure_temperature.4')) {
          let temp4 = result.ext_temperature[3].tC;
          if (typeof temp4 == 'number' && temp4 != this.getCapabilityValue('measure_temperature.4')) {
            this.updateCapabilityValue('measure_temperature.4', temp4, 0);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature4').trigger(this, {'temperature': temp4}, {}).catch(error => { this.error(error) });
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
        const oldVersionDate = new Date(result.update.old_version.split('/')[0].slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
        const newVersionDate = new Date(result.update.new_version.split('/')[0].slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
        const betaVersionDate = new Date(result.update.beta_version.split('/')[0].slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    
        const isNewAvailable = newVersionDate > oldVersionDate;
        const isBetaAvailable = betaVersionDate > oldVersionDate;
    
        const currentVersion = result.update.old_version.split('/')[1].split('-')[0].replace(/^v/, '');;
        const newVersion = result.update.new_version.split('/')[1].split('-')[0].replace(/^v/, '');;
        const betaVersion = result.update.beta_version.split('/')[1].split('-')[0].replace(/^v/, '');;

        const firmware = {
          new: isNewAvailable,
          beta: isBetaAvailable,
          currentVersion: currentVersion,
          newVersion: newVersion,
          betaVersion: betaVersion
        }

        /* initially set firmware data */
        if (this.getStoreValue('firmware') === undefined || this.getStoreValue('firmware') === null) {
          await this.setStoreValue("firmware", firmware);
        }

        if (isNewAvailable && newVersion !== this.getStoreValue('firmware').newVersion ) {
          this.homey.flow.getTriggerCard('triggerFWUpdate').trigger({"id": this.getData().id, "device": this.getName(), "firmware": newVersion, "stage": "stable"}).catch(error => { this.error(error) });
          await this.setStoreValue("firmware", firmware);
        }

        if (isBetaAvailable && betaVersion !== this.getStoreValue('firmware').betaVersion ) {
          this.homey.flow.getTriggerCard('triggerFWUpdate').trigger({"id": this.getData().id, "device": this.getName(), "firmware": betaVersion, "stage": "beta"}).catch(error => { this.error(error) });
          await this.setStoreValue("firmware", firmware);
        }
      }

    } catch (error) {
      this.error(error);
    }
  }

  /* generic full status updates parser for polling over HTTP, inbound websocket full status updates and cloud full status updates for gen2 */
  async parseFullStatusUpdateGen2(result = {}) {
    try {
      this.setAvailability(true);

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

        /* windowcoverings_tilt_set */
        if (result["cover:"+channel].hasOwnProperty("slat_pos")) {
          this.updateCapabilityValue('windowcoverings_tilt_set', result["cover:"+channel].slat_pos / 100, channel);
        }

        /* temperature (component) */
        if (result["cover:"+channel].hasOwnProperty("temperature")) {
          if (result["cover:"+channel].temperature.hasOwnProperty("tC")) {
            this.updateCapabilityValue('measure_temperature', result["cover:"+channel].temperature.tC, channel);
          }
        }

      }

      // LIGHT / RGB / RGBW / CCT COMPONENT
      if (result.hasOwnProperty("light:"+ channel) || result.hasOwnProperty("rgb:"+ channel) || result.hasOwnProperty("rgbw:"+ channel) || result.hasOwnProperty("cct:"+ channel)) {

        let component = {};

        if (result.hasOwnProperty("light:"+ channel)) {
          component = result["light:"+ channel];
        } else if (result.hasOwnProperty("rgb:"+ channel)) {
          component = result["rgb:"+ channel];
        } else if (result.hasOwnProperty("rgbw:"+ channel)) {
          component = result["rgbw:"+ channel];
        } else if (result.hasOwnProperty("cct:"+ channel)) {
          component = result["cct:"+ channel];
        }

        /* onoff */
        if (component.hasOwnProperty("output")) {
          if ((component === result["light:"+ channel] || component === result["cct:"+ channel]) && this.hasCapability('onoff.light')) {
            this.updateCapabilityValue('onoff.light', component.output, channel);
          } else {
            this.updateCapabilityValue('onoff', component.output, channel);
          }
        }

        /* dim */
        if (component.hasOwnProperty("brightness")) {
          let brightness = component.brightness / 100;
          if ((component === result["light:"+ channel] || component === result["cct:"+ channel]) && this.hasCapability('dim.light')) {
            this.updateCapabilityValue('dim.light', brightness, channel);
          } else {
            this.updateCapabilityValue('dim', brightness, channel);
          }
        }

        /* light_temperature */
        if (component.hasOwnProperty("ct")) {
          const light_temperature = 1 - Number(this.util.normalize(component.ct, 2700, 6500));
          this.updateCapabilityValue('light_temperature', light_temperature, channel);
        }

        /* measure_power */
        if (component.hasOwnProperty("apower")) {
          if ((component === result["light:"+ channel] || component === result["cct:"+ channel]) && this.hasCapability('measure_power.light')) {
            this.updateCapabilityValue('measure_power.light', component.apower, channel);
          } else {
            this.updateCapabilityValue('measure_power', component.apower, channel);
          }
        }

        /* meter_power */
        if (component.hasOwnProperty("aenergy")) {
          if (component.aenergy.hasOwnProperty("total")) {
            let meter_power = component.aenergy.total / 1000;
            if ((component === result["light:"+ channel] || component === result["cct:"+ channel]) && this.hasCapability('meter_power.light')) {
              this.updateCapabilityValue('meter_power.light', meter_power, channel);
            } else {
              this.updateCapabilityValue('meter_power', meter_power, channel);
            }
          }
        }

        /* measure_voltage */
        if (component.hasOwnProperty("voltage")) {
          if ((component === result["light:"+ channel] || component === result["cct:"+ channel]) && this.hasCapability('measure_voltage.light')) {
            this.updateCapabilityValue('measure_voltage.light', component.voltage, channel);
          } else {
            this.updateCapabilityValue('measure_voltage', component.voltage, channel);
          }
        }

        /* measure_current */
        if (component.hasOwnProperty("current")) {
          if ((component === result["light:"+ channel] || component === result["cct:"+ channel]) && this.hasCapability('measure_current.light')) {
            this.updateCapabilityValue('measure_current.light', component.current, channel);
          } else {
            this.updateCapabilityValue('measure_current', component.current, channel);
          }
        }

        /* measure_temperature (device temperature) */
        if (component.hasOwnProperty("temperature")) {
          if ((component === result["light:"+ channel] || component === result["cct:"+ channel]) && this.hasCapability('measure_temperature.light')) {
            this.updateCapabilityValue('measure_temperature.light', component.temperature.tC, channel);
          } else {
            this.updateCapabilityValue('measure_temperature', component.temperature.tC, channel);
          }
        }

        /* dim.white */
        if (component.hasOwnProperty("white")) {
          let white = Number(this.util.normalize(component.white, 0, 255));
          this.updateCapabilityValue('dim.white', white, channel);
        }

        /* light_hue & light_saturation */
        if (component.hasOwnProperty("rgb")) {
          let color = tinycolor({r: component.rgb[0], g: component.rgb[1], b: component.rgb[2]});
          let hsv = color.toHsv();
          let light_hue = Number((hsv.h / 360).toFixed(2));

          // light_hue
          this.updateCapabilityValue('light_hue', light_hue, channel);

          // light_saturation
          this.updateCapabilityValue('light_saturation', hsv.s, channel);
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

      // TRV COMPONENT (Shelly BLU TRV over BLU Gateway Gen3)
      if (result.hasOwnProperty("trv:"+ channel)) {

        /* target_temperature */
        if (result["trv:"+channel].hasOwnProperty("target_C")) {
          this.updateCapabilityValue('target_temperature', result["trv:"+channel].target_C, channel);
        }

        /* measure_temperature */
        if (result["trv:"+channel].hasOwnProperty("current_C")) {
          this.updateCapabilityValue('measure_temperature.thermostat', result["trv:"+channel].current_C, channel);
        }

        /* valve_position */
        if (result["trv:"+channel].hasOwnProperty("pos")) {
          this.updateCapabilityValue('valve_position', result["trv:"+channel].pos, channel);
        }

        // TODO: currently this status of the TRV does not report battery, Allterco Robotics needs to fix this in the TRV firmware so  it can be added here.

      }

      // MEASURE POWER, METER POWER AND TEMPERATURE FOR SWITCH AND COVER
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

      // EM:0 MEASURE POWER (single channel instantaneous power readings like Pro 3EM in triphase mode)
      if (result.hasOwnProperty("em:0")) {

        if (this.getStoreValue('config').id !== 'shellypro3em-triphase') {

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
            this.updateCapabilityValue('measure_current.total', result["em:0"].total_current, 0);
  
            /* measure_voltage */
            this.updateCapabilityValue('measure_voltage', result["em:0"].a_voltage, 0);
  
            /* measure_power_apparent */
            this.parseCapabilityUpdate('measure_power_apparent', result["em:0"].a_aprt_power, 0);
  
          } else if (this.getStoreValue('channel') === 1) {
  
            /* measure_power */
            this.updateCapabilityValue('measure_power', result["em:0"].b_act_power, 1);
  
            /* meter_power_factor */
            this.parseCapabilityUpdate('meter_power_factor', result["em:0"].b_pf, 1);
  
            /* measure_current */
            this.updateCapabilityValue('measure_current', result["em:0"].b_current, 1);
  
            /* measure_voltage */
            this.updateCapabilityValue('measure_voltage', result["em:0"].b_voltage, 1);
  
            /* measure_power_apparent */
            this.parseCapabilityUpdate('measure_power_apparent', result["em:0"].b_aprt_power, 1);
  
          } else if (this.getStoreValue('channel') === 2) {
  
            /* measure_power */
            this.updateCapabilityValue('measure_power', result["em:0"].c_act_power, 2);
  
            /* meter_power_factor */
            this.parseCapabilityUpdate('meter_power_factor', result["em:0"].c_pf, 2);
  
            /* measure_current */
            this.updateCapabilityValue('measure_current', result["em:0"].c_current, 2);
  
            /* measure_voltage */
            this.updateCapabilityValue('measure_voltage', result["em:0"].c_voltage, 2);
  
            /* measure_power_apparent */
            this.parseCapabilityUpdate('measure_power_apparent', result["em:0"].c_aprt_power, 2);
  
          }

        } else if (this.getStoreValue('config').id === 'shellypro3em-triphase') {

          /* measure_power */
          if (this.getCapabilityValue('measure_power') !== result["em:0"].total_act_power) {
            this.updateCapabilityValue('measure_power', result["em:0"].total_act_power, 0);
          }

          /* measure_current */
          this.updateCapabilityValue('measure_current', result["em:0"].total_current, 0);

          /* measure_power.a.b.c */
          this.updateCapabilityValue('measure_power.a', result["em:0"].a_act_power, 0);
          this.updateCapabilityValue('measure_power.b', result["em:0"].b_act_power, 0);
          this.updateCapabilityValue('measure_power.c', result["em:0"].c_act_power, 0);

          /* measure_current */
          this.updateCapabilityValue('measure_current.a', result["em:0"].a_current, 0);
          this.updateCapabilityValue('measure_current.b', result["em:0"].b_current, 0);
          this.updateCapabilityValue('measure_current.c', result["em:0"].c_current, 0);

          /* measure_voltage */
          this.updateCapabilityValue('measure_voltage.a', result["em:0"].a_voltage, 0);
          this.updateCapabilityValue('measure_voltage.b', result["em:0"].b_voltage, 0);
          this.updateCapabilityValue('measure_voltage.c', result["em:0"].c_voltage, 0);

        }

      }

      // EMDATA:0 METER POWER (single channel energy readings like Pro 3EM in triphase mode)
      if (result.hasOwnProperty("emdata:0")) {

        if (this.getStoreValue('config').id !== 'shellypro3em-triphase') {
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
        } else if (this.getStoreValue('config').id === 'shellypro3em-triphase') {

          /* meter_power */
          const meter_power_total = result["emdata:0"].total_act / 1000;
          if (this.getCapabilityValue('meter_power') !== meter_power_total) {
            this.updateCapabilityValue('meter_power', meter_power_total, 0);
          }

          /* meter_power.total_returned */
          const meter_power_total_returned = result["emdata:0"].total_act_ret / 1000;
          if (this.getCapabilityValue('meter_power.total_returned') !== meter_power_total_returned) {
            this.updateCapabilityValue('meter_power.total_returned', meter_power_total_returned, 0);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturnedTotal').trigger(this, {'energy': meter_power_total_returned}, {}).catch(error => { this.error(error) });
          }

          /* meter_power.a.b.c */
          this.updateCapabilityValue('meter_power.a', result["emdata:0"].a_total_act_energy / 1000, 0);
          this.updateCapabilityValue('meter_power.b', result["emdata:0"].b_total_act_energy / 1000, 0);
          this.updateCapabilityValue('meter_power.c', result["emdata:0"].c_total_act_energy / 1000, 0);

        }



      }

      // EM1:x MEASURE POWER (multi channel instantaneous power readings like Pro 3EM in monophase mode)
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

      // EMDATA1:x METER POWER (multi channel instantaneous power readings like Pro 3EM in monophase mode)
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
          if (result["input:2"].counts.hasOwnProperty("totalx")) {
            await this.updateCapabilityValue('input_pulse_counts_total_x', result["input:2"].counts.totalx, 0);
            if (this.getCapabilityValue('input_pulse_counts_total_x') !== result["input:2"].counts.totalx) {
              this.homey.flow.getDeviceTriggerCard('triggerInputCountsTotalX').trigger(this, {'pulse': result["input:2"].counts.totalx}, {}).catch(error => { this.error(error) });
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

      if (result.hasOwnProperty("input:4")) {
        if (result["input:4"].hasOwnProperty("state") && result["input:4"].state !== null) {
          if (this.hasCapability('input_5') && channel === 0) { // update input_5 for channel 0
            const input5Triggercard = result["input:4"].state ? 'triggerInput5On' : 'triggerInput5Off';
            this.triggerDeviceTriggerCard('input_5', result["input:4"].state, 0, input5Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_5', result["input:4"].state, 0, 'triggerInput5Changed', {}, {});
            this.updateCapabilityValue('input_5', result["input:4"].state, channel);
          } else if (this.hasCapability('input_1') && channel === 4) { // update input_1 for channel 3
            const input5_1Triggercard = result["input:4"].state ? 'triggerInput1On' : 'triggerInput1Off';
            this.triggerDeviceTriggerCard('input_1', result["input:4"].state, 4, input5_1Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_1', result["input:4"].state, 4, 'triggerInput1Changed', {}, {});
            this.updateCapabilityValue('input_1', result["input:4"].state, channel);
          } else if (this.hasCapability('multiDividedInputs')) { // update input_5 for channel 1 for multichannel device with multiple inputs per channel
            const input5_1Triggercard = result["input:4"].state ? 'triggerInput5On' : 'triggerInput5Off';
            this.triggerDeviceTriggerCard('input_5', result["input:4"].state, 1, input5_1Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_5', result["input:4"].state, 1, 'triggerInput5Changed', {}, {});
            this.updateCapabilityValue('input_5', result["input:4"].state, 1);
          }
        } else if (result["input:4"].hasOwnProperty("state") && result["input:4"].state === null) {
          if (this.hasCapability('input_5') && channel === 0) { // remove input_4 for channel 0
            await this.removeCapability('input_5');
            this.log('Removing capability input_5 of channel 0 as the input is configured as button');
          } else if (this.hasCapability('input_1') && channel === 4) { // remove input_1 for channel 3
            await this.removeCapability('input_1');
            this.log('Removing capability input_1 of channel 4 as the input is configured as button');
          } else if (this.hasCapability('multiDividedInputs') && this.hasCapability('input_5')) {
            await this.removeCapability('input_5');
            this.log('Removing capability input_5 of channel 1 as the input is configured as button');
          }
        }
      }

      // ADD ON SENSORS

      /* add-on temperature 1 */
      if (result.hasOwnProperty("temperature:100") && channel === 0) {
        if (this.hasCapability('measure_temperature.1')) {
          if (this.getCapabilityValue('measure_temperature.1') !== result["temperature:100"].tC && result["temperature:100"].tC !== null) {
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
          if (this.getCapabilityValue('measure_temperature.2') !== result["temperature:101"].tC && result["temperature:101"].tC !== null) {
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
          if (this.getCapabilityValue('measure_temperature.3') !== result["temperature:102"].tC && result["temperature:102"].tC !== null) {
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
          if (this.getCapabilityValue('measure_temperature.4') !== result["temperature:103"].tC && result["temperature:103"].tC !== null) {
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
          if (this.getCapabilityValue('measure_temperature.5') !== result["temperature:104"].tC && result["temperature:104"].tC !== null) {
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
          if (this.getCapabilityValue('measure_humidity.1') !== result["humidity:100"].tC) {
            this.updateCapabilityValue('measure_humidity.1', result["humidity:100"].rh, channel);
            this.homey.flow.getDeviceTriggerCard('triggerHumidity1').trigger(this, {'humidity': result["humidity:100"].rh}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_humidity.1');
        }
      }

      /* add-on humidity 2 */
      if (result.hasOwnProperty("humidity:101") && channel === 0) {
        if (this.hasCapability('measure_humidity.2')) {
          if (this.getCapabilityValue('measure_humidity.2') !== result["humidity:101"].tC) {
            this.updateCapabilityValue('measure_humidity.2', result["humidity:101"].rh, channel);
            this.homey.flow.getDeviceTriggerCard('triggerHumidity2').trigger(this, {'humidity': result["humidity:101"].rh}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_humidity.2');
        }
      }

      /* add-on humidity 3 */
      if (result.hasOwnProperty("humidity:102") && channel === 0) {
        if (this.hasCapability('measure_humidity.3')) {
          if (this.getCapabilityValue('measure_humidity.3') !== result["humidity:102"].tC) {
            this.updateCapabilityValue('measure_humidity.3', result["humidity:102"].rh, channel);
            this.homey.flow.getDeviceTriggerCard('triggerHumidity3').trigger(this, {'humidity': result["humidity:102"].rh}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_humidity.3');
        }
      }

      /* add-on humidity 4 */
      if (result.hasOwnProperty("humidity:103") && channel === 0) {
        if (this.hasCapability('measure_humidity.4')) {
          if (this.getCapabilityValue('measure_humidity.4') !== result["humidity:103"].tC) {
            this.updateCapabilityValue('measure_humidity.4', result["humidity:103"].rh, channel);
            this.homey.flow.getDeviceTriggerCard('triggerHumidity4').trigger(this, {'humidity': result["humidity:103"].rh}, {}).catch(error => { this.error(error) });
          }
        } else {
          this.addCapability('measure_humidity.4');
        }
      }

      /* add-on humidity 5 */
      if (result.hasOwnProperty("humidity:104") && channel === 0) {
        if (this.hasCapability('measure_humidity.5')) {
          if (this.getCapabilityValue('measure_humidity.5') !== result["humidity:104"].tC) {
            this.updateCapabilityValue('measure_humidity.5', result["humidity:104"].rh, channel);
            this.homey.flow.getDeviceTriggerCard('triggerHumidity4').trigger(this, {'humidity': result["humidity:104"].rh}, {}).catch(error => { this.error(error) });
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
      var device_type = this.getStoreValue('config').id.includes("blu") ? 'bluetooth' : 'gen2'; // hack for getting the right button event for Bluetooth devices connected to a cloud connected Plus/Pro device

      if (result.hasOwnProperty("v_eve:0")) {
        if (result["v_eve:0"].hasOwnProperty("ev")) {
          if (result["v_eve:0"].ev !== '') {
            if (channel === 0 && this.hasCapability('multiInputs')) {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.util.getActionEventDescription(result["v_eve:0"].ev, 'cloud', device_type) + '_1'}, {"action": this.util.getActionEventDescription(result["v_eve:0"].ev, 'cloud', device_type) + '_1'}).catch(error => { this.error(error) });
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.util.getActionEventDescription(result["v_eve:0"].ev, 'cloud', device_type)}, {"action": this.util.getActionEventDescription(result["v_eve:0"].ev, 'cloud', device_type)}).catch(error => { this.error(error) });
            }
          }
        }
      }

      if (result.hasOwnProperty("v_eve:1")) {
        if (result["v_eve:1"].hasOwnProperty("ev")) {
          if (result["v_eve:1"].ev !== '') {
            if (channel === 0 && this.hasCapability('multiInputs')) {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.util.getActionEventDescription(result["v_eve:1"].ev, 'cloud', device_type) + '_2'}, {"action": this.util.getActionEventDescription(result["v_eve:1"].ev, 'cloud', device_type) + '_2'}).catch(error => { this.error(error) });
            } else {
              const device_id = this.getStoreValue('main_device') + '-channel-1';
              const shellies = this.homey.app.getShellyCollection();
              const shelly = shellies.filter(shelly => shelly.id.includes(device_id));
              const device = shelly[0].device;
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.util.getActionEventDescription(result["v_eve:1"].ev, 'cloud', device_type)}, {"action": this.util.getActionEventDescription(result["v_eve:1"].ev, 'cloud', device_type)}).catch(error => { this.error(error) });
            }
          }
        }
      }

      if (result.hasOwnProperty("v_eve:2")) {
        if (result["v_eve:2"].hasOwnProperty("ev")) {
          if (result["v_eve:2"].ev !== '') {
            if (channel === 0 && this.hasCapability('multiInputs')) {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.util.getActionEventDescription(result["v_eve:2"].ev, 'cloud', device_type) + '_3'}, {"action": this.util.getActionEventDescription(result["v_eve:2"].ev, 'cloud', device_type) + '_3'}).catch(error => { this.error(error) });
            } else {
              const device_id = this.getStoreValue('main_device') + '-channel-2';
              const shellies = this.homey.app.getShellyCollection();
              const shelly = shellies.filter(shelly => shelly.id.includes(device_id));
              const device = shelly[0].device;
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.util.getActionEventDescription(result["v_eve:2"].ev, 'cloud', device_type)}, {"action": this.util.getActionEventDescription(result["v_eve:2"].ev, 'cloud', device_type)}).catch(error => { this.error(error) });
            }
          }
        }
      }

      if (result.hasOwnProperty("v_eve:3")) {
        if (result["v_eve:3"].hasOwnProperty("ev")) {
          if (result["v_eve:3"].ev !== '') {
            if (channel === 0 && this.hasCapability('multiInputs')) {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.util.getActionEventDescription(result["v_eve:3"].ev, 'cloud', 'gen2') + '_4'}, {"action": this.util.getActionEventDescription(result["v_eve:3"].ev, 'cloud', 'gen2') + '_4'}).catch(error => { this.error(error) });
            } else {
              const device_id = this.getStoreValue('main_device') + '-channel-3';
              const shellies = this.homey.app.getShellyCollection();
              const shelly = shellies.filter(shelly => shelly.id.includes(device_id));
              const device = shelly[0].device;
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.util.getActionEventDescription(result["v_eve:3"].ev, 'cloud', 'gen2')}, {"action": this.util.getActionEventDescription(result["v_eve:3"].ev, 'cloud', 'gen2')}).catch(error => { this.error(error) });
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

          /* initially gather firmware data */
          if (this.getStoreValue('firmware') === undefined || this.getStoreValue('firmware') === null) {
            const config = await this.util.sendRPCCommand('/rpc/Shelly.GetDeviceInfo', this.getSetting('address'), this.getSetting('password'));
            const firmware = {
              new: false,
              beta: false,
              currentVersion: config.ver,
              newVersion: config.ver,
              betaVersion: config.ver
            }
            await this.setStoreValue("firmware", firmware);
          }

          if (result.sys.available_updates.hasOwnProperty("stable")) {
            if (result.sys.available_updates.stable.version !== this.getStoreValue('firmware').newVersion) {
              const firmware_current = await this.getStoreValue("firmware");
              const firmware_new = {
                new: true,
                beta: firmware_current.beta,
                currentVersion: firmware_current.currentVersion,
                newVersion: result.sys.available_updates.stable.version,
                betaVersion: firmware_current.betaVersion
              }
              this.homey.flow.getTriggerCard('triggerFWUpdate').trigger({"id": this.getData().id, "device": this.getName(), "firmware": result.sys.available_updates.stable.version, "stage": "stable"}).catch(error => { this.error(error) });
              await this.setStoreValue("firmware", firmware_new);
            }            
          } else if (!result.sys.available_updates.hasOwnProperty("stable") && this.getStoreValue('firmware').new) {
            const firmware_current = await this.getStoreValue("firmware");
            const firmware_new = {
              new: false,
              beta: firmware_current.beta,
              currentVersion: firmware_current.currentVersion,
              newVersion: firmware_current.newVersion,
              betaVersion: firmware_current.betaVersion
            }
            await this.setStoreValue("firmware", firmware_new);
          }

          if (result.sys.available_updates.hasOwnProperty("beta")) {
            if (result.sys.available_updates.beta.version !== this.getStoreValue('firmware').betaVersion) {
              const firmware_current = await this.getStoreValue("firmware");
              const firmware_new = {
                new: firmware_current.new,
                beta: true,
                currentVersion: firmware_current.currentVersion,
                newVersion: firmware_current.newVersion,
                betaVersion: result.sys.available_updates.beta.version
              }
              this.homey.flow.getTriggerCard('triggerFWUpdate').trigger({"id": this.getData().id, "device": this.getName(), "firmware": result.sys.available_updates.beta.version, "stage": "beta"}).catch(error => { this.error(error) });
              await this.setStoreValue("firmware", firmware_new);
            }
          } else if (!result.sys.available_updates.hasOwnProperty("beta") && this.getStoreValue('firmware').beta) {
            const firmware_current = await this.getStoreValue("firmware");
            const firmware_new = {
              new: firmware_current.new,
              beta: false,
              currentVersion: firmware_current.currentVersion,
              newVersion: firmware_current.newVersion,
              betaVersion: firmware_current.betaVersion
            }
            await this.setStoreValue("firmware", firmware_new);
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
      this.setAvailability(true);

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
                      if (capability === 'total') {
                        if ((component.startsWith('cct') || component.startsWith('light')) && this.hasCapability('onoff.light')) { /* parse secondary light data */
                          this.parseCapabilityUpdate('meter_power.light', values, channel);
                        } else {
                          this.parseCapabilityUpdate('meter_power', values, channel);
                        }
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
                      } else if (capability === 'totalx') {
                        this.parseCapabilityUpdate('input_pulse_counts_total_x', values, 0);
                      } else if (capability === 'by_minute') {
                        this.parseCapabilityUpdate('input_pulse_counts_minute', values[0], 0);
                      }
                    }
                  } else if (capability === 'rgb') {
                    this.parseCapabilityUpdate('rgb', value, channel);
                  } else {
                    for (const [capability, values] of Object.entries(value)) {
                      if (capability !== 'by_minute' && capability !== 'minute_ts' && capability !== 'tF') {
                        if ((component.startsWith('cct') || component.startsWith('light')) && this.hasCapability('onoff.light')) { /* parse secondary light data */
                          this.parseCapabilityUpdate(capability+'.light', values, channel);
                        } else {
                          this.parseCapabilityUpdate(capability, values, channel);
                        }
                      }
                    }
                  }
                } else if ((component.startsWith('cct') || component.startsWith('light')) && this.hasCapability('onoff.light')) { /* parse first and secondary light data */
                  this.parseCapabilityUpdate(capability+'.light', value, channel);
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
                      } else if (input === 'input2' || input === 'input3' || input === 'input4') {
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
                } else if (component.startsWith('boolean') || component.startsWith('number') || component.startsWith('text') || component.startsWith('enum'))  { // parse virtual component status updates
                  let type = component.substring(0, component.length - 4);
                  let boolean = false;
                  let number = 0;
                  let text = 'empty';
                  let enumeration = 'none';
                  let button = 'empty';
    
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
                    {"vc_type": type, "vc_id": component, "boolean": boolean, "number": number, "text": text, "enum": enumeration, "button": button}, 
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
                  (this.hasCapability('multiDividedInputs') && channel === 3 && this.hasCapability('input_4')) ||
                  (this.hasCapability('multiDividedInputs') && channel === 4 && this.hasCapability('input_5'))
                ) { // if channel is 0 or device has multiple inputs but is not a multichannel device in Homey we have the right device
                  device = this;
                } else { // get the right device based on the channel

                  /* get the device id with exceptions for for multichannel devices with multi inputs per channel */
                  if (this.hasCapability('multiDividedInputs') && (channel === 0 || channel === 1)) {
                    device_id = this.getStoreValue('main_device') + '-channel-0';
                  } else if (this.hasCapability('multiDividedInputs') && (channel === 2 || channel === 3 || channel === 4)) {
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

                  // TODO: remove this eventually as this card is deprecated but probably still in use
                  this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": device.getData().id, "device": device.getName(), "action": action_event }, {"id": device.getData().id, "device": device.getName(), "action": action_event }).catch(error => { this.error(error) });
                }
                
              } else if (event.component.startsWith('button')) { // parse virtual component buttons
                this.homey.flow.getDeviceTriggerCard('triggerVirtualComponents').trigger(
                  this,
                  {"vc_type": "button", "vc_id": event.component, "boolean": false, "number": 0, "text": "empty", "enum": "none", "button": event.event}, 
                  {"vc_id": event.component}
                ).catch(error => { this.error(error) });
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
      this.setAvailability(true);

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
        case 'output.light':
          this.updateCapabilityValue('onoff.light', value, channel);
          break;
        case 'apower':
        case 'power0':
        case 'power1':
        case 'power2':
        case 'power3':
          this.updateCapabilityValue('measure_power', value, channel);
          break;
        case 'apower.light':
          this.updateCapabilityValue('measure_power.light', value, channel);
          break;
        case 'act_power':
          this.updateCapabilityValue('measure_power', value, channel);
          break;
        case 'a_act_power':
          if (this.getStoreValue('config').id === 'shellypro3em-triphase') {
            this.updateCapabilityValue('measure_power.a', value, 0);
          } else {
            this.updateCapabilityValue('measure_power', value, 0);
          }
          break;
        case 'b_act_power':
          if (this.getStoreValue('config').id === 'shellypro3em-triphase') {
            this.updateCapabilityValue('measure_power.b', value, 0);
          } else {
            this.updateCapabilityValue('measure_power', value, 1);
          }
          break;
        case 'c_act_power':
          if (this.getStoreValue('config').id === 'shellypro3em-triphase') {
            this.updateCapabilityValue('measure_power.c', value, 0);
          } else {
            this.updateCapabilityValue('measure_power', value, 2);
          }
          break;
        case 'total_act_power':
          if (this.getStoreValue('config').id === 'shellypro3em-triphase') {
            this.updateCapabilityValue('measure_power', value, 0);
          } else if (this.getStoreValue('config').id !== 'shellypro3em-triphase' && this.getStoreValue('channel') === 0) {
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
          if (this.getStoreValue('config').id === 'shellypro3em-triphase') {
            this.updateCapabilityValue('meter_power.a', a_total_act_energy, 0);
          } else {
            this.updateCapabilityValue('meter_power', a_total_act_energy, 0);
          }
          break;
        case 'b_total_act_energy':
          const b_total_act_energy = value / 1000;
          if (this.getStoreValue('config').id === 'shellypro3em-triphase') {
            this.updateCapabilityValue('meter_power.b', b_total_act_energy, 0);
          } else {
            this.updateCapabilityValue('meter_power', b_total_act_energy, 1);
          }
          break;
        case 'c_total_act_energy':
          const c_total_act_energy = value / 1000;
          if (this.getStoreValue('config').id === 'shellypro3em-triphase') {
            this.updateCapabilityValue('meter_power.c', c_total_act_energy, 0);
          } else {
            this.updateCapabilityValue('meter_power', c_total_act_energy, 2);
          }
          break;
        case 'meter_power':
          let meter_power_pm = value / 1000;
          this.updateCapabilityValue('meter_power', meter_power_pm, channel);
          break;
        case 'meter_power.light':
          let meter_power_pm_light = value / 1000;
          this.updateCapabilityValue('meter_power.light', meter_power_pm_light, channel);
          break;
        case 'meter_power_returned':
          const meter_power_returned_pm = value / 1000;
          this.updateCapabilityValue('meter_power.returned', meter_power_returned_pm, channel);
          break;
        case 'total_act':
          const meter_power_total_act = value / 1000;
          if (this.getStoreValue('config').id === 'shellypro3em-triphase') {
            this.updateCapabilityValue('meter_power', meter_power_total_act, 0);
          } else if (this.getStoreValue('config').id !== 'shellypro3em-triphase' && this.getStoreValue('channel') === 0) {
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
          if (this.getStoreValue('config').id !== 'shellypro3em-triphase') {
            const a_total_act_ret_energy = value / 1000;
            if (this.getCapabilityValue('meter_power.returned') !== a_total_act_ret_energy) {
              this.updateCapabilityValue('meter_power.returned', a_total_act_ret_energy, 0);
              this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned').trigger(this, {'energy': a_total_act_ret_energy}, {}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'b_total_act_ret_energy':
          if (this.getStoreValue('config').id !== 'shellypro3em-triphase') {
            const b_total_act_ret_energy = value / 1000;
            if (this.getCapabilityValue('meter_power.returned') !== b_total_act_ret_energy) {
              this.updateCapabilityValue('meter_power.returned', b_total_act_ret_energy, 1);
              this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned').trigger(this, {'energy': b_total_act_ret_energy}, {}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'c_total_act_ret_energy':
          if (this.getStoreValue('config').id !== 'shellypro3em-triphase') {
            const c_total_act_ret_energy = value / 1000;
            if (this.getCapabilityValue('meter_power.returned') !== c_total_act_ret_energy) {
              this.updateCapabilityValue('meter_power.returned', c_total_act_ret_energy, 2);
              this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned').trigger(this, {'energy': c_total_act_ret_energy}, {}).catch(error => { this.error(error) });
            }
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
          if (this.getStoreValue('config').id !== 'shellypro3em-triphase') {
            this.updateCapabilityValue('meter_power_factor', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerFactor').trigger(this, {'pf': value}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'b_pf':
          if (this.getStoreValue('config').id !== 'shellypro3em-triphase') {
            this.updateCapabilityValue('meter_power_factor', value, 1);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerFactor').trigger(this, {'pf': value}, {}).catch(error => { this.error(error) });
          }
          break;
        case 'c_pf':
          if (this.getStoreValue('config').id !== 'shellypro3em-triphase') {
            this.updateCapabilityValue('meter_power_factor', value, 2);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerFactor').trigger(this, {'pf': value}, {}).catch(error => { this.error(error) });
          }
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
        case 'current.light':
          this.updateCapabilityValue('measure_current.light', value, channel);
          break;
        case 'a_current':
          if (this.getStoreValue('config').id === 'shellypro3em-triphase') {
            this.updateCapabilityValue('measure_current.a', value, 0);
          } else {
            this.updateCapabilityValue('measure_current', value, 0);
          }
          break;
        case 'b_current':
          if (this.getStoreValue('config').id === 'shellypro3em-triphase') {
            this.updateCapabilityValue('measure_current.b', value, 0);
          } else {
            this.updateCapabilityValue('measure_current', value, 1);
          }
          break;
        case 'c_current':
          if (this.getStoreValue('config').id === 'shellypro3em-triphase') {
            this.updateCapabilityValue('measure_current.c', value, 0);
          } else {
            this.updateCapabilityValue('measure_current', value, 2);
          }
          break;
        case 'total_current':
          if (this.getStoreValue('config').id === 'shellypro3em-triphase') {
            this.updateCapabilityValue('measure_current', value, 0);
          } else {
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
        case 'voltage.light':
          this.updateCapabilityValue('measure_voltage.light', value, channel);
          break;
        case 'a_voltage':
          if (this.getStoreValue('config').id === 'shellypro3em-triphase') {
            this.updateCapabilityValue('measure_voltage.a', value, 0);
          } else {
            this.updateCapabilityValue('measure_voltage', value, 0);
          }
          break;
        case 'b_voltage':
          if (this.getStoreValue('config').id === 'shellypro3em-triphase') {
            this.updateCapabilityValue('measure_voltage.b', value, 0);
          } else {
            this.updateCapabilityValue('measure_voltage', value, 1);
          }
          break;
        case 'c_voltage':
          if (this.getStoreValue('config').id === 'shellypro3em-triphase') {
            this.updateCapabilityValue('measure_voltage.c', value, 0);
          } else {
            this.updateCapabilityValue('measure_voltage', value, 2);
          }
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
          channel = channel > 100 ? 0 : channel; // update battery for Shelly BLU TRV
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
              this.updateCapabilityValue('measure_temperature.1', value, 0);
              this.homey.flow.getDeviceTriggerCard('triggerTemperature1').trigger(this, {'temperature': value}, {}).catch(error => { this.error(error) });
            }
          } else if (this.getStoreValue('channel') === 0 && channel === 101 && typeof value !== 'object' && this.hasCapability('measure_temperature.2')) {
            if (this.getCapabilityValue('measure_temperature.2') !== value) {
              this.updateCapabilityValue('measure_temperature.2', value, 0);
              this.homey.flow.getDeviceTriggerCard('triggerTemperature2').trigger(this, {'temperature': value}, {}).catch(error => { this.error(error) });
            }
          } else if (this.getStoreValue('channel') === 0 && channel === 102 && typeof value !== 'object' && this.hasCapability('measure_temperature.3')) {
            if (this.getCapabilityValue('measure_temperature.3') !== value) {
              this.updateCapabilityValue('measure_temperature.3', value, 0);
              this.homey.flow.getDeviceTriggerCard('triggerTemperature3').trigger(this, {'temperature': value}, {}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'tC.light':
          this.updateCapabilityValue('measure_temperature.light', value, channel);
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
        case 'slat_pos':
          this.updateCapabilityValue('windowcoverings_tilt_set', value / 100, channel);
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
        case 'brightness.light':
          let dim_light = value >= 100 ? 1 : value / 100;
          this.updateCapabilityValue('dim.light', dim_light, channel);
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
        case 'ct':
          if (this.getStoreValue('config').id === 'shellyprorgbwwpm-rgbcct' || this.getStoreValue('config').id === 'shellyprorgbwwpm-cctx2' || this.getStoreValue('config').id === 'shellyprorgbwwpm-rgbx2light') {
            var light_temperature = 1 - Number(this.util.normalize(value, 2700, 6500)); // Shelly Pro RGBWW PM in CCT
          } else if (this.getStoreValue('config').id === 'shellybulbduo') {
            value = value === 0 ? 2700 : value;
            var light_temperature = 1 - Number(this.util.normalize(value, 2700, 6500)); // Shelly Duo
          } else {
            value = value === 0 ? 3000 : value;
            var light_temperature = 1 - Number(this.util.normalize(value, 3000, 6500)); // Shelly Bulb
          }
          this.updateCapabilityValue('light_temperature', this.util.clamp(light_temperature, 0, 1), channel);
          break;
        case 'whiteLevel':
          // Shelly DUO
          let light_temperature_whitelevel = 1 - value / 100;
          this.updateCapabilityValue('light_temperature', this.util.clamp(light_temperature_whitelevel, 0, 1), channel);
          break;
        case 'white':
          const white = Number(this.util.normalize(value , 0, 255));
          this.updateCapabilityValue('dim.white', this.util.clamp(white, 0, 1), channel);
          if (white > 0.5 && !this.getCapabilityValue('onoff.whitemode')) {
            this.updateCapabilityValue('onoff.whitemode', true, channel);
          } else if (white <= 0.5 && this.getCapabilityValue('onoff.whitemode')) {
            this.updateCapabilityValue('onoff.whitemode', false, channel);
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
        case 'rgb':
          let color = tinycolor({r: value[0], g: value[1], b: value[2]});
          let hsv = color.toHsv();
          let light_hue = Number((hsv.h / 360).toFixed(2));
          this.updateCapabilityValue('light_hue', light_hue, channel);
          this.updateCapabilityValue('light_saturation', hsv.s, channel);
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
          this.updateCapabilityValue('alarm_gas', alarm, channel);
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
          this.updateCapabilityValue('input_1', value, channel);
          this.triggerDeviceTriggerCard('input_1', value, channel, input1Triggercard, {}, {});
          this.triggerDeviceTriggerCard('input_1', value, channel, 'triggerInput1Changed', {}, {});
          break;
        case 'input1':
          if (typeof value == 'number') {
            value = value === 0 ? false : true;
          }
          if (!this.hasCapability('input_2')) {
            const input2_1Triggercard = value ? 'triggerInput1On' : 'triggerInput1Off';
            this.updateCapabilityValue('input_1', value, channel);
            this.triggerDeviceTriggerCard('input_1', value, channel, input2_1Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_1', value, channel, 'triggerInput1Changed', {}, {});
          } else {
            const input2Triggercard = value ? 'triggerInput2On' : 'triggerInput2Off';
            this.updateCapabilityValue('input_2', value, channel);
            this.triggerDeviceTriggerCard('input_2', value, channel, input2Triggercard, {}, {});
            this.triggerDeviceTriggerCard('input_2', value, channel, 'triggerInput2Changed', {}, {});
          }
          break;
        case 'input2':
          if (typeof value == 'number') {
            value = value === 0 ? false : true;
          }
          const input3Triggercard = value ? 'triggerInput3On' : 'triggerInput3Off';
          this.updateCapabilityValue('input_3', value, channel);
          this.triggerDeviceTriggerCard('input_3', value, channel, input3Triggercard, {}, {});
          this.triggerDeviceTriggerCard('input_3', value, channel, 'triggerInput3Changed', {}, {});
          break;
        case 'input3':
          if (typeof value == 'number') {
            value = value === 0 ? false : true;
          }
          const input4Triggercard = value ? 'triggerInput4On' : 'triggerInput4Off';
          this.updateCapabilityValue('input_4', value, channel);
          this.triggerDeviceTriggerCard('input_4', value, channel, input4Triggercard, {}, {});
          this.triggerDeviceTriggerCard('input_4', value, channel, 'triggerInput4Changed', {}, {});
          break;
        case 'input4':
          if (typeof value == 'number') {
            value = value === 0 ? false : true;
          }
          const input5Triggercard = value ? 'triggerInput5On' : 'triggerInput5Off';
          this.updateCapabilityValue('input_5', value, channel);
          this.triggerDeviceTriggerCard('input_5', value, channel, input5Triggercard, {}, {});
          this.triggerDeviceTriggerCard('input_5', value, channel, 'triggerInput5Changed', {}, {});
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

              // TODO: remove this eventually as this card is deprecated but probably still in use
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent1')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent1')}).catch(error => { this.error(error) });
            }
          } else {
            if (value > 0 && (typeof this.getStoreValue('actionEvent') === 'string' || this.getStoreValue('actionEvent') instanceof String)) {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.getStoreValue('actionEvent')}, {"action": this.getStoreValue('actionEvent')}).catch(error => { this.error(error) });

              // TODO: remove this eventually as this card is deprecated but probably still in use
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'inputEventCounter1':
          if (this.hasCapability('input_1') && this.hasCapability('input_2')) {
            if (value > 0 && (typeof this.getStoreValue('actionEvent2') === 'string' || this.getStoreValue('actionEvent2') instanceof String)) {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.getStoreValue('actionEvent2')}, {"action": this.getStoreValue('actionEvent2')}).catch(error => { this.error(error) });

              // TODO: remove this eventually as this card is deprecated but probably still in use
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent2')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent2')}).catch(error => { this.error(error) });
            }
          } else {
            if (value > 0 && (typeof this.getStoreValue('actionEvent') === 'string' || this.getStoreValue('actionEvent') instanceof String)) {
              this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.getStoreValue('actionEvent')}, {"action": this.getStoreValue('actionEvent')}).catch(error => { this.error(error) });

              // TODO: remove this eventually as this card is deprecated but probably still in use
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')}).catch(error => { this.error(error) });
            }
          }
          break;
        case 'inputEventCounter2':
          if (value > 0 && (typeof this.getStoreValue('actionEvent3') === 'string' || this.getStoreValue('actionEvent3') instanceof String)) {
            this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": this.getStoreValue('actionEvent3')}, {"action": this.getStoreValue('actionEvent3')}).catch(error => { this.error(error) });

              // TODO: remove this eventually as this card is deprecated but probably still in use
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
        case 'externalTemperature3':
          if (value != this.getCapabilityValue('measure_temperature.4')) {
            this.updateCapabilityValue('measure_temperature.4', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature4').trigger(this, {'temperature': value}, {}).catch(error => { this.error(error) });
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
        case 'input_pulse_counts_total_x':
          if (value != this.getCapabilityValue('input_pulse_counts_total_x')) {
            this.updateCapabilityValue('input_pulse_counts_total_x', value, 0);
            this.homey.flow.getDeviceTriggerCard('triggerInputCountsTotalX').trigger(this, {'pulse': value}, {}).catch(error => { this.error(error) });
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
        case 'rssi':
          this.updateCapabilityValue('rssi', value, 0);
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

      if (this.getStoreValue('gen') === 'gen1') {
        switch(value) {
          case 'stop':
            windowcoverings_state = 'idle'
            break;
          case 'open':
            windowcoverings_state = 'up';
            break;
          case 'close':
            windowcoverings_state = 'down';
            break;
          default:
            break;
        }
      } else if (this.getStoreValue('gen') === 'gen2' || this.getStoreValue('gen') === 'gen3') {
        switch(value) {
          case 'open':
          case 'closed':
          case 'stopped':
            windowcoverings_state = 'idle'
            break;
          case 'opening':
            windowcoverings_state = 'up';
            break;          
          case 'closing':
            windowcoverings_state = 'down';
            break;
          default:
            break;
        }
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

  /* set availability for all channels in sync */
  async setAvailability(availability, error = null) {
    try {
      if (availability) {
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

      } else {
        const message = error === null ? this.homey.__('device.unreachable') : this.homey.__('device.unreachable') + error.message;

        if (this.getAvailable()) { await this.setUnavailable(message).catch(error => { this.error(error) });};
        this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": this.getName(), "device_error": message.toString()}).catch(error => { this.error(error) });

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
                    device.setUnavailable(message).catch(error => { this.error(error) });
                    device.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": device.getName(), "device_error": message.toString()}).catch(error => { this.error(error) });
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      this.error(error);
    }
  }

  /* update device config on device init */
  async updateDeviceConfig() {
    try {

      /* placeholder for update for specific devices */

      // TODO: remove on next release
      if (this.getStoreValue('config').id === 'shellygas' && (this.hasCapability('alarm_smoke') || !this.hasCapability('alarm_gas'))) {
        await this.removeCapability('alarm_smoke');
        await this.addCapability('alarm_gas');
      }

      if (this.getStoreValue('communication') === 'coap' || this.getStoreValue('communication') === 'websocket') { /* COAP AND WEBSOCKET */

        /* get the current device config */
        let device_config = this.util.getDeviceConfig(this.getStoreValue('config').hostname[0], 'hostname');
        let result;
        let config;

        /* for non-battery operated devices retrieve the actual status */
        if (!this.getStoreValue('battery')) {

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
            this.error(this.getData().id, 'with hostname', this.getStoreValue('config').hostname[0], 'has no valid device config and/or was not able to return its status upon init ...');
            return Promise.reject(this.getData().id, 'with hostname', this.getStoreValue('config').hostname[0], 'has no valid device config and/or was not able to return its status upon init ...');
          }

        }

        if (typeof device_config !== 'undefined' && device_config.hostname !== 'xmod1') {

          /* updating device config store value */
          await this.setStoreValue('config', device_config);

          /* add any missing capabilities to the device based on device config */
          if (this.getStoreValue('channel') === 0) {
            device_config.capabilities_1.forEach(async (capability) => {
              if(!this.hasCapability(capability) && !['input_1', 'input_2', 'input_3', 'input_4', 'input_5'].includes(capability)) {
                this.log('Adding capability', capability, 'to', this.getData().id, 'with name', this.getName(), 'upon device init as the device does not have it already but its added in the device config.');
                await this.addCapability(capability).catch(this.error);
              }
            });
          } else {
            device_config.capabilities_2.forEach(async (capability) => {
              if(!this.hasCapability(capability) && !['input_1', 'input_2', 'input_3', 'input_4', 'input_5'].includes(capability)) {
                this.log('Adding capability', capability, 'to', this.getData().id, 'with name', this.getName(), 'upon device init as the device does not have it already but its added in the device config.');
                await this.addCapability(capability).catch(this.error);
              }
            });
          }

          /* set device class if changed */
          if (this.getClass() !== device_config.class && this.getStoreValue('customclass') !== true) {
            this.log('Updating device class from', this.getClass(), 'to', device_config.class, 'for', this.getName());
            this.setClass(device_config.class)
          }

          /* set energy object if changed */
          let energyObject = JSON.parse(JSON.stringify(await this.getEnergy()));
          let energyObjectEqual = true;
          if (energyObject !== null) {
            if (device_config.energy.hasOwnProperty('batteries') && energyObject.hasOwnProperty('batteries')) {
              if (!this.util.arraysEqual(this.getEnergy().batteries, device_config.energy.batteries)) {
                energyObject.batteries = device_config.energy.batteries;
                energyObjectEqual = false;
              }
            }
            if (device_config.energy.hasOwnProperty('cumulativeImportedCapability')) {
              if (this.getEnergy().cumulativeImportedCapability !== device_config.energy.cumulativeImportedCapability) {
                energyObject.cumulativeImportedCapability = device_config.energy.cumulativeImportedCapability;
                energyObjectEqual = false;
              }
            }
            if (device_config.energy.hasOwnProperty('cumulativeExportedCapability')) {
              if (this.getEnergy().cumulativeExportedCapability !== device_config.energy.cumulativeExportedCapability) {
                energyObject.cumulativeExportedCapability = device_config.energy.cumulativeExportedCapability;
                energyObjectEqual = false;
              }
            }
            if (!energyObjectEqual) {
              this.log('Updating energy object from', JSON.stringify(this.getEnergy()), 'to', JSON.stringify(energyObject), 'for', this.getName());
              await this.setEnergy(energyObject).catch(this.error);
            }
          }


          /* update device capability options */
          if (Object.keys(device_config.capability_options).length > 0) {
            for (const key in device_config.capability_options) {
              if (this.hasCapability(key)) {
                try {
                  const capability_option = await this.getCapabilityOptions(key);
                  if (JSON.stringify(capability_option) !== JSON.stringify(device_config.capability_options[key])) {
                    this.log('Updating capability option', key, 'with', JSON.stringify(device_config.capability_options[key]), 'to', this.getData().id, 'with name', this.getName());
                    await this.setCapabilityOptions(key, device_config.capability_options[key]);
                  }
                } catch (error) {
                  if (error.message.includes('Invalid Capability')) {
                    this.log('Adding capability option', key, 'with', JSON.stringify(device_config.capability_options[key]), 'to', this.getData().id, 'with name', this.getName());
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

        /* update Homey BLE Proxy script, only uncomment on release when the script needs to be updated */
        if (this.hasCapability('button.enable_ble_script') && ((this.getStoreValue('ble_script_version') === null || this.getStoreValue('ble_script_version') === undefined) || this.getStoreValue('ble_script_version') < this.bluetoothScriptVersion)) {
          for (const key in config) {
            if (config.hasOwnProperty(key) && key.startsWith('script:')) {
              const script = config[key];
              if (script.name === 'Homey BLE Proxy') {
                const scriptID = await this.util.enableBLEProxy(this.getSetting('address'), this.getSetting('password'));
                await this.setStoreValue('ble_script_version', this.bluetoothScriptVersion);
                await this.setStoreValue('ble_script_id', scriptID);
                this.log('Updating Homey BLE Script to version', this.bluetoothScriptVersion ,'for', this.getData().id, 'with name', this.getName());
              }
            }
          }
        }
        
        return Promise.resolve(true);

      } else if (this.getStoreValue('communication') === 'bluetooth') { /* BLUETOOTH DEVICES */

        let device_config = this.util.getDeviceConfig(this.getStoreValue('type'), 'bluetooth');

        if (typeof device_config !== 'undefined') {

          /* updating device config store value */
          await this.setStoreValue('config', device_config);

          /* add any missing capabilities to the device based on device config */
          device_config.capabilities_1.forEach(async (capability) => {
            if(!this.hasCapability(capability) && !['input_1', 'input_2', 'input_3', 'input_4'].includes(capability)) {
              this.log('Adding capability', capability, 'to', this.getData().id, 'with name', this.getName(), 'upon device init as the device does not have it already but its added in the device config.');
              await this.addCapability(capability).catch(this.error);
            }
          });

          /* set device class if changed */
          if (this.getClass() !== device_config.class && this.getStoreValue('customclass') !== true) {
            this.log('Updating device class from', this.getClass(), 'to', device_config.class, 'for', this.getName());
            this.setClass(device_config.class)
          }

          /* set energy object if changed */
          let energyObject = JSON.parse(JSON.stringify(await this.getEnergy()));
          let energyObjectEqual = true;
          if (energyObject !== null) {
            if (device_config.energy.hasOwnProperty('batteries') && energyObject.hasOwnProperty('batteries')) {
              if (!this.util.arraysEqual(this.getEnergy().batteries, device_config.energy.batteries)) {
                energyObject.batteries = device_config.energy.batteries;
                energyObjectEqual = false;
              }
            }
            if (device_config.energy.hasOwnProperty('cumulativeImportedCapability')) {
              if (this.getEnergy().cumulativeImportedCapability !== device_config.energy.cumulativeImportedCapability) {
                energyObject.cumulativeImportedCapability = device_config.energy.cumulativeImportedCapability;
                energyObjectEqual = false;
              }
            }
            if (device_config.energy.hasOwnProperty('cumulativeExportedCapability')) {
              if (this.getEnergy().cumulativeExportedCapability !== device_config.energy.cumulativeExportedCapability) {
                energyObject.cumulativeExportedCapability = device_config.energy.cumulativeExportedCapability;
                energyObjectEqual = false;
              }
            }
            if (!energyObjectEqual) {
              this.log('Updating energy object from', JSON.stringify(this.getEnergy()), 'to', JSON.stringify(energyObject), 'for', this.getName());
              await this.setEnergy(energyObject).catch(this.error);
            }
          }

        } else {
          return Promise.reject(this.getData().id + ' has no valid device config to set');
        }

      } else if (this.getStoreValue('communication') === 'cloud') { /* CLOUD DEVICES */
        
        let device_config = this.util.getDeviceConfig(this.getStoreValue('config').hostname[0], 'hostname');

        if (typeof device_config !== 'undefined') {

          /* update the communication config to cloud */
          device_config.communication = 'cloud';

          /* updating device config store value */
          await this.setStoreValue('config', device_config);

          /* add any missing capabilities to the device based on device config */
          if (this.getStoreValue('channel') === 0) {
            device_config.capabilities_1.forEach(async (capability) => {
              if(!this.hasCapability(capability) && !['input_1', 'input_2', 'input_3', 'input_4'].includes(capability)) {
                this.log('Adding capability', capability, 'to', this.getData().id, 'with name', this.getName(), 'upon device init as the device does not have it already but its added in the device config.');
                await this.addCapability(capability).catch(this.error);
              }
            });
          } else {
            device_config.capabilities_2.forEach(async (capability) => {
              if(!this.hasCapability(capability) && !['input_1', 'input_2', 'input_3', 'input_4'].includes(capability)) {
                this.log('Adding capability', capability, 'to', this.getData().id, 'with name', this.getName(), 'upon device init as the device does not have it already but its added in the device config.');
                await this.addCapability(capability).catch(this.error);
              }
            });
          }

          /* set device class if changed */
          if (this.getClass() !== device_config.class && this.getStoreValue('customclass') !== true) {
            this.log('Updating device class from', this.getClass(), 'to', device_config.class, 'for', this.getName());
            this.setClass(device_config.class)
          }

          /* set energy object if changed */
          let energyObject = JSON.parse(JSON.stringify(await this.getEnergy()));
          let energyObjectEqual = true;
          if (energyObject !== null) {
            if (device_config.energy.hasOwnProperty('batteries') && energyObject.hasOwnProperty('batteries')) {
              if (!this.util.arraysEqual(this.getEnergy().batteries, device_config.energy.batteries)) {
                energyObject.batteries = device_config.energy.batteries;
                energyObjectEqual = false;
              }
            }
            if (device_config.energy.hasOwnProperty('cumulativeImportedCapability')) {
              if (this.getEnergy().cumulativeImportedCapability !== device_config.energy.cumulativeImportedCapability) {
                energyObject.cumulativeImportedCapability = device_config.energy.cumulativeImportedCapability;
                energyObjectEqual = false;
              }
            }
            if (device_config.energy.hasOwnProperty('cumulativeExportedCapability')) {
              if (this.getEnergy().cumulativeExportedCapability !== device_config.energy.cumulativeExportedCapability) {
                energyObject.cumulativeExportedCapability = device_config.energy.cumulativeExportedCapability;
                energyObjectEqual = false;
              }
            }
            if (!energyObjectEqual) {
              this.log('Updating energy object from', JSON.stringify(this.getEnergy()), 'to', JSON.stringify(energyObject), 'for', this.getName());
              await this.setEnergy(energyObject).catch(this.error);
            }
          }

          /* update device capability options */
          if (Object.keys(device_config.capability_options).length > 0) {
            for (const key in device_config.capability_options) {
              if (this.hasCapability(key)) {
                try {
                  const capability_option = await this.getCapabilityOptions(key);
                  if (JSON.stringify(capability_option) !== JSON.stringify(device_config.capability_options[key])) {
                    this.log('Updating capability option', key, 'with', JSON.stringify(device_config.capability_options[key]), 'to', this.getData().id, 'with name', this.getName());
                    await this.setCapabilityOptions(key, device_config.capability_options[key]);
                  }
                } catch (error) {
                  if (error.message.includes('Invalid Capability')) {
                    this.log('Adding capability option', key, 'with', JSON.stringify(device_config.capability_options[key]), 'to', this.getData().id, 'with name', this.getName());
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
      return Promise.reject(error);
    }
  }

}

module.exports = ShellyDevice;