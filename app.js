'use strict';

const Homey = require('homey');
const Util = require('./lib/util.js');
const shellies = require('shellies');
const WebSocket = require('ws');

class ShellyApp extends Homey.App {

  async onInit() {
    this.log('Initializing Shelly App ...');

    if (!this.util) this.util = new Util({homey: this.homey});

    // VARIABLES GENERIC
    this.shellyDevices = [];

    // VARIABLES CLOUD
    this.cloudPairingDevice = {};
    this.cloudInstall = false;
    this.cloudServer = null;
    this.ws = null;
    this.wsConnected = false;

    // CLOUD: REGISTER WEBHOOK FOR SHELLY INTEGRATOR PORTAL
    const homeyId = await this.homey.cloud.getHomeyId();
    const webhook_id = Homey.env.WEBHOOK_ID;
    const webhook_secret = Homey.env.WEBHOOK_SECRET;
    const webhook_data = { deviceId: homeyId }
    const webhook = await this.homey.cloud.createWebhook(webhook_id, webhook_secret, webhook_data);

    // CLOUD: CHECK IF THERE ARE PAIRED CLOUD DEVICES AND OPEN WEBSOCKET
    this.homey.setTimeout(async () => {
      let result = await this.util.getCloudDetails();
      this.cloudInstall = result.cloudInstall;
      this.cloudServer = result.server_address;

      if (this.cloudInstall && this.cloudServer) {
        let jwtToken = await this.util.getJWTToken(Homey.env.SHELLY_TAG, Homey.env.SHELLY_TOKEN);
        this.websocketCloudListener(jwtToken);
      }
    }, 5000);

    // COAP, CLOUD & GEN2 WEBSOCKETS: INITIALLY UPDATE THE SHELLY COLLECTION
    this.homey.setTimeout(async () => {
      await this.updateShellyCollection();
    }, 30000);

    // COAP: START COAP LISTENER FOR RECEIVING STATUS UPDATES
    this.homey.setTimeout(async () => {
      if (!this.cloudInstall) {
        if (!this.homey.settings.get('general_coap')) {
          this.log('CoAP listener for gen1 LAN devices started.');
          shellies.start();
        } else {
          this.log('CoAP listener not started, the CoAP listener has been disabled from the app settings');
        }
      }
    }, 40000);

    // COAP, CLOUD & GEN2 WEBSOCKETS: UPDATE THE SHELLY COLLECTION REGULARLY
    this.homey.setInterval(async () => {
      await this.updateShellyCollection();
    }, 900000);

    // GENERIC FLOWCARDS
    this.homey.flow.getTriggerCard('triggerDeviceOffline');
    this.homey.flow.getTriggerCard('triggerFWUpdate');

    const listenerCallbacks = this.homey.flow.getTriggerCard('triggerCallbacks').registerRunListener(async (args, state) => {
      try {
        if (args.action.action === undefined) {
          var action = args.action.name;
        } else {
          var action = args.action.action;
        }
        if (
          (state.id == args.shelly.id && args.action.id === 999) ||
          (args.shelly.id === 'all' && state.action == action) ||
          (args.shelly.id === 'all' && args.action.id === 999) ||
          ((state.id === args.shelly.id || args.shelly === undefined) && (state.action === action || args.action === undefined))
        ) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      } catch (error) {
        return Promise.reject(error);
      }
    });
    listenerCallbacks.getArgument('shelly').registerAutocompleteListener(async (query, args) => {
      return await this.util.getShellies('flowcard');
    });
    listenerCallbacks.getArgument('action').registerAutocompleteListener(async (query, args) => {
      return await this.util.getActions(args.shelly.actions);
    });

    this.homey.flow.getConditionCard('conditionInput0')
      .registerRunListener(async (args) => {
        if (args.device) {
          return args.device.getCapabilityValue("input_1");
        } else {
          return false;
        }
      })

    this.homey.flow.getConditionCard('conditionInput1')
      .registerRunListener(async (args) => {
        if (args.device) {
          return args.device.getCapabilityValue("input_2");
        } else {
          return false;
        }
      })

    this.homey.flow.getConditionCard('conditionInput2')
      .registerRunListener(async (args) => {
        if (args.device) {
          return args.device.getCapabilityValue("input_3");
        } else {
          return false;
        }
      })

    this.homey.flow.getActionCard('actionReboot')
      .registerRunListener(async (args) => {
        if (args.device.getStoreValue('communication') === 'coap') {
          return await this.util.sendCommand('/reboot', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else if (args.device.getStoreValue('communication') === 'websocket') {
          return await args.device.ws.send(JSON.stringify({"id": args.device.getCommandId(), "method": "Shelly.Reboot", "params": {"delay_ms": 0} }));
        } else if (args.device.getStoreValue('communication') === 'cloud') {
          return await this.util.sendCloudCommand('/device/reboot', args.device.getSetting('server_address'), args.device.getSetting('cloud_token'), args.device.getSetting('cloud_device_id'));
        }
      })

    this.homey.flow.getActionCard('actionOTAUpdate')
      .registerRunListener(async (args) => {
        return await this.util.sendCommand('/ota?update=true', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    this.homey.flow.getActionCard('flipbackSwitch')
      .registerRunListener(async (args) => {
        var onoff = args.switch === "1" ? 'on' : 'off';
        if (args.device.getStoreValue('communication') === 'coap') {
          return await this.util.sendCommand('/relay/0?turn='+ onoff +'&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else if (args.device.getStoreValue('communication') === 'websocket') {
          return await args.device.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Switch.Set", "params": {"id": this.getStoreValue('channel'), "on": onoff, "toggle": args.timer} }));
        } else if (args.device.getStoreValue('communication') === 'cloud') {
          return await this.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest-timer', command: 'relay', command_param: 'turn', command_value: onoff, timer_param: 'timeout', timer: args.timer, deviceid: args.device.getSetting('cloud_device_id'), channel: args.device.getStoreValue('channel')})]);
        }
      })

    this.homey.flow.getActionCard('onOffTransition')
      .registerRunListener(async (args) => {
        var onoff = args.switch === "1" ? 'on' : 'off';
        if (args.device.getStoreValue('communication') === 'coap') {
          return await this.util.sendCommand('/light/0?turn='+ onoff +'&transition='+ args.transition +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else if (args.device.getStoreValue('communication') === 'websocket') {
          return await args.device.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Switch.Set", "params": {"id": this.getStoreValue('channel'), "on": onoff, "transition": args.transition} }));
        } else if (args.device.getStoreValue('communication') === 'cloud') {
          return await this.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest-timer', command: 'light', command_param: 'turn', command_value: onoff, timer_param: 'transition', timer: args.transition, deviceid: args.device.getSetting('cloud_device_id'), channel: args.device.getStoreValue('channel')})]);
        }
      })

    // SHELLY RGBW2
    this.homey.flow.getActionCard('effectRGBW2Color')
      .registerRunListener(async (args) => {
        return await this.util.sendCommand('/color/0?turn=on&effect='+ Number(args.effect) +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    this.homey.flow.getActionCard('actionRGBW2EnableWhiteMode')
      .registerRunListener(async (args) => {
        return args.device.triggerCapabilityListener("onoff.whitemode", true);
      })

    this.homey.flow.getActionCard('actionRGBW2DisableWhiteMode')
      .registerRunListener(async (args) => {
        return args.device.triggerCapabilityListener("onoff.whitemode", false);
      })

    // SHELLY 2(.5) ROLLER SHUTTER
    this.homey.flow.getActionCard('moveRollerShutter')
      .registerRunListener(async (args) => {
        if (args.direction == 'open') {
          args.device.setStoreValue('last_action', 'up');
          args.device.setCapabilityValue('windowcoverings_state','up');
        } else if (args.direction == 'close') {
          args.device.setStoreValue('last_action', 'down');
          args.device.setCapabilityValue('windowcoverings_state','down');
        }
        return await this.util.sendCommand('/roller/0?go='+ args.direction +'&duration='+ args.move_duration +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    this.homey.flow.getActionCard('moveRollerShutterOffset')
      .registerRunListener(async (args) => {
        if (args.direction == 'open') {
          args.device.setStoreValue('last_action', 'up');
          args.device.setCapabilityValue('windowcoverings_state','up');
        } else if (args.direction == 'close') {
          args.device.setStoreValue('last_action', 'down');
          args.device.setCapabilityValue('windowcoverings_state','down');
        }
        return await this.util.sendCommand('/roller/0?go='+ args.direction +'&offset='+ args.offset +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    this.homey.flow.getActionCard('rollerShutterIntelligentAction')
      .registerRunListener(async (args) => {
        if (args.device.getCapabilityValue('windowcoverings_state') !== 'idle') {
          args.device.setCapabilityValue('windowcoverings_state','idle');
          return await this.util.sendCommand('/roller/0?go=stop', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else if (args.device.getStoreValue('last_action') === 'up') {
          args.device.setStoreValue('last_action', 'down');
          args.device.setCapabilityValue('windowcoverings_state','down');
          return await this.util.sendCommand('/roller/0?go=close', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else if (args.device.getStoreValue('last_action') === 'down') {
          args.device.setStoreValue('last_action', 'up');
          args.device.setCapabilityValue('windowcoverings_state','up');
          return await this.util.sendCommand('/roller/0?go=open', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else {
          return Promise.reject(error);
        }
      })

    this.homey.flow.getActionCard('moveRollerShutterPreviousPosition')
      .registerRunListener(async (args) => {
        let position = args.device.getStoreValue('previous_position');
        if (position == undefined) {
			    return Promise.reject('previous position has not been set yet');
		    } else {
          args.device.setStoreValue('previous_position', args.device.getCapabilityValue('windowcoverings_set'));
          if (args.device.getSetting('halfway') != 0.5) {
				    if (position > 0.5) {
              position = -2 * position * args.device.getSetting('halfway') + 2 * position + 2 * args.device.getSetting('halfway') - 1;
            } else {
              position = 2 * position * args.device.getSetting('halfway');
            };
		        args.device.setCapabilityValue('windowcoverings_set', position);
		        return await this.util.sendCommand('/roller/0?go=to_pos&roller_pos='+ Math.round(position*100), args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
  	      } else {
            args.device.setCapabilityValue('windowcoverings_set', position);
		        return await this.util.sendCommand('/roller/0?go=to_pos&roller_pos='+ Math.round(position*100), args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          }
        }
  	  })

    // SHELLY GAS
    this.homey.flow.getActionCard('actionGasSetVolume')
      .registerRunListener(async (args) => {
        return await this.util.sendCommand('/settings/?set_volume='+ args.volume +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    this.homey.flow.getActionCard('actionGasMute')
      .registerRunListener(async (args) => {
        return await this.util.sendCommand('/mute', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    this.homey.flow.getActionCard('actionGasUnmute')
      .registerRunListener(async (args) => {
        return await this.util.sendCommand('/unmute', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    this.homey.flow.getActionCard('actionGasTest')
      .registerRunListener(async (args) => {
        return await this.util.sendCommand('/self_test', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    // COAP: COAP LISTENER
    shellies.on('discover', device => {
      this.log('Discovered device with ID', device.id, 'and type', device.type, 'with IP address', device.host);

      device.on('change', (prop, newValue, oldValue) => {
        try {
          //this.log(prop, 'changed from', oldValue, 'to', newValue, 'for device', device.id, 'with IP address', device.host);
          if (this.shellyDevices.length > 0) {
            const filteredShellies = this.shellyDevices.filter(shelly => shelly.id.includes(device.id));
            if (filteredShellies.length > 0) {
              if (filteredShellies.length === 1) {
                var deviceid = filteredShellies[0].id;
              } else {
                const channel = prop.slice(prop.length - 1);
                if(isNaN(channel)) {
                  var deviceid = filteredShellies[0].main_device+'-channel-0';
                } else {
                  var deviceid = filteredShellies[0].main_device+'-channel-'+channel;
                }
              }
              const filteredShelly = filteredShellies.filter(shelly => shelly.id.includes(deviceid));
              const homeydevice = filteredShelly[0].device;
              homeydevice.parseCapabilityUpdate(prop, newValue);
              if (homeydevice.getSetting('address') !== device.host) {
                homeydevice.setSettings({address: device.host});
              }
              return;
            }
          }
        } catch (error) {
          this.log('Error processing CoAP message for device', device.id, 'of type', device.type, 'with IP address', device.host, 'on capability', prop, 'with old value', oldValue, 'to new value', newValue);
          this.log(error);
        }
      })

      device.on('offline', () => {
        try {
          if (this.shellyDevices.length > 0) {
            const offlineShellies = this.shellyDevices.filter(shelly => shelly.id.includes(device.id));
            if (offlineShellies.length > 0) {
              Object.keys(offlineShellies).forEach(key => {
                this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": device.id, "device_error": 'Device is offline'});
              });
            }
          }
        } catch (error) {
          this.log(error);
        }
      })
    });

    // CLOUD: PROCESS SHELLY CLOUD DEVICE REGISTRATION
    webhook.on('message', async (args) => {
      try {
        this.log('received webhook message:');
        this.log(args.body)
        if (args.body.action === 'add') {
          this.cloudServer = args.body.host;
          this.cloudPairingDevice = args.body;
        }

        // start websocket listener, it could be the first device being paired
        if (this.ws === null || this.ws.readyState === WebSocket.CLOSED) {
          let jwtToken = await this.util.getJWTToken(Homey.env.SHELLY_TAG, Homey.env.SHELLY_TOKEN);
          this.websocketCloudListener(jwtToken);
        }
      } catch (error) {
        this.log(error);
      }
    });
  }

  async onUninit() {
    clearTimeout(this.wsPingInterval);
    clearTimeout(this.wsPingTimeout);
    clearTimeout(this.wsReconnectTimeout);
  }

  // COAP: UPDATE SETTINGS AND START/STOP COAP LISTENER
  async updateSettings(settings) {
    try {
      if (settings.general_coap) {
        this.log('CoAP listener has been disabled from the app settings and the listener is now stopped');
        shellies.stop();
        return Promise.resolve(true);
      } else {
        this.log('CoAP listener has been enabled from the app settings and the listener is now (re)started');
        shellies.stop();
        this.homey.setTimeout(async () => {
          shellies.start();
        }, 4000);
        return Promise.resolve(true);
      }
    } catch(error) {
      this.log(error);
      return Promise.reject(error);
    }
  }

  // COAP & GEN2 WEBSOCKETS: UPDATE COLLECTION OF DEVICES
  async updateShellyCollection() {
    try {
      let newShellyDevices = await this.util.getShellies('collection');
      this.shellyDevices = newShellyDevices;
      return Promise.resolve(true);
    } catch(error) {
      this.log(error);
      return Promise.reject(error);
    }
  }

  // CLOUD: OPEN WEBSOCKET FOR STATUS CLOUD DEVICES
  async websocketCloudListener(jwtToken) {
    this.ws = new WebSocket('wss://'+ this.cloudServer +':6113/shelly/wss/hk_sock?t='+ jwtToken, {perMessageDeflate: false});

    this.ws.on('open', () => {
      this.log('Websocket for cloud devices opened.');
    	this.wsConnected = true;

      // start sending pings every 2 minutes to check the connection status
      clearTimeout(this.wsPingInterval);
      this.wsPingInterval = this.homey.setInterval(() => {
        this.ws.ping();
      }, 120 * 1000);
    });

    this.ws.on('message', async (data) => {
      try {
        const result = JSON.parse(data);
        if (result.event === 'Shelly:StatusOnChange') {
          const filteredShellies = this.shellyDevices.filter(shelly => shelly.id.includes(result.deviceId));
          for (const filteredShelly of filteredShellies) {
            filteredShelly.device.parseStatusUpdate(result.status);
            await this.util.sleep(250);
          }
        } else if (result.event === 'Integrator:ActionResponse') {
          const filteredShellies = this.shellyDevices.filter(shelly => shelly.id.includes(result.data.deviceId));
          for (const filteredShelly of filteredShellies) {
            if (filteredShelly.device.getStoreValue('type') !== result.data.deviceCode) {
              filteredShelly.device.setStoreValue('type', result.data.deviceCode);
            }
            filteredShelly.device.parseStatusUpdate(result.data.deviceStatus);
            await this.util.sleep(250);
          }
        }
      } catch (error) {
        this.log(error);
      }
    });

    this.ws.on('pong', () => {
      clearTimeout(this.wsPingTimeout);
      this.wsPingTimeout = this.homey.setTimeout(async () => {
        if (this.ws === null || this.ws.readyState === WebSocket.CLOSED) {
          this.wsConnected = false;
          let jwtToken = await this.util.getJWTToken(Homey.env.SHELLY_TAG, Homey.env.SHELLY_TOKEN);
          this.websocketCloudListener(jwtToken);
        } else if (this.wsConnected) {
          this.ws.close();
        }
      }, 130 * 1000);
    });

    this.ws.on('error', (error) => {
      this.log('Websocket error:', error);
      this.ws.close();
    });

    this.ws.on('close', (code, reason) => {
      this.log('Websocket closed due to reasoncode:', code);
      this.wsConnected = false;

      // retry connection after 500 miliseconds
      clearTimeout(this.wsReconnectTimeout);
      this.wsReconnectTimeout = this.homey.setTimeout(async () => {
        let jwtToken = await this.util.getJWTToken(Homey.env.SHELLY_TAG, Homey.env.SHELLY_TOKEN);
        this.websocketCloudListener(jwtToken);
      }, 500);
    });

  }

  // CLOUD: SEND COMMANDS OVER WEBSOCKET
  async websocketSendCommand(commands) {
    try {
      for (let command of commands) {
    		this.ws.send(command);
    		await this.util.sleep(500);
    	}
      return Promise.resolve(true);
    } catch (error) {
      this.log('Websocket error sending command');
      this.log(error);

      if (this.ws === null || this.ws.readyState === WebSocket.CLOSED) {
        this.wsConnected = false;
        let jwtToken = await this.util.getJWTToken(Homey.env.SHELLY_TAG, Homey.env.SHELLY_TOKEN);
        this.websocketCloudListener(jwtToken);
      } else if (this.wsConnected) {
        this.ws.close();
      }

      return Promise.reject(error);
    }
  }

  // CLOUD: FABRICATE SHELLY INTEGRATOR PORTAL URL
  async getIntegratorUrl() {
    const homeyId = await this.homey.cloud.getHomeyId();
    return 'https://my.shelly.cloud/integrator.html?itg='+ Homey.env.SHELLY_TAG +'&cb=https://webhooks.athom.com/webhook/'+ Homey.env.WEBHOOK_ID +'/?homey='+ homeyId
  }

  // CLOUD: RETURN SHARED CLOUD DEVICE FOR PAIRING
  async getPairingDevice() {
    if (this.cloudPairingDevice.hasOwnProperty('deviceId')) {
      return Promise.resolve(this.cloudPairingDevice);
    } else {
      return Promise.reject(this.homey.__('app.no_pairing_device_found'));
    }
  }

}

module.exports = ShellyApp;
