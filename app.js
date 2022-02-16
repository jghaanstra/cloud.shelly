'use strict';

const Homey = require('homey');
const { OAuth2App } = require('homey-oauth2app');
const ShellyOAuth2Client = require('./lib/ShellyOAuth2Client');
const Util = require('./lib/util.js');
const shellies = require('shellies');
const WebSocket = require('ws');
const jwt_decode = require('jwt-decode');

class ShellyApp extends OAuth2App {

  static OAUTH2_CLIENT = ShellyOAuth2Client;
  static OAUTH2_DEBUG = false;
  static OAUTH2_MULTI_SESSION = false;
  //static OAUTH2_DRIVERS = ['shelly-plug-s_cloud', 'shelly-plug_cloud', 'shelly-pro-1_cloud', 'shelly-pro-1pm_cloud', 'shelly-pro-2_cloud', 'shelly-pro-2pm_cloud', 'shelly1_cloud', 'shelly1l_cloud', 'shelly1pm_cloud', 'shelly25_cloud', 'shelly2_cloud', 'shelly3em_cloud', 'shelly4pro_cloud', 'shellyair_cloud', 'shellybulb_cloud', 'shellybutton1_cloud', 'shellydimmer_cloud', 'shellyduo_cloud', 'shellydw_cloud', 'shellyem_cloud', 'shellyflood_cloud', 'shellyht_cloud', 'shellyi3_cloud', 'shellyi4_cloud', 'shellymotion_cloud', 'shellyrgbw2color_cloud', 'shellyrgbw2white_cloud', 'shellysmoke_cloud', 'shellyuni_cloud', 'shellyvintage_cloud'];
  static OAUTH2_DRIVERS = ['shelly1_cloud'];

  async onInit() {
    this.log('Initializing Shelly App ...');

    if (!this.util) this.util = new Util({homey: this.homey});

    // VARIABLES GENERIC
    this.shellyDevices = [];

    // VARIABLES CLOUD
    this.cloudInstall = false;
    this.cloudServer = null;
    this.cloudAccessToken = null;
    this.ws = null;
    this.wsConnected = false;

    // CLOUD: COPEN WEBSOCKET
    this.homey.setTimeout(async () => {
      this.websocketCloudListener();
    }, 5000);

    // COAP, CLOUD & GEN2 WEBSOCKETS: INITIALLY UPDATE THE SHELLY COLLECTION FOR MATCHING INCOMING STATUS UPDATES
    this.homey.setTimeout(async () => {
      await this.updateShellyCollection();
    }, 20000);

    // COAP: START COAP LISTENER FOR RECEIVING STATUS UPDATES
    this.homey.setTimeout(async () => {
      if (!this.cloudInstall) { // TODO: make a standalone cloud install check and drop this variable
        if (!this.homey.settings.get('general_coap')) {
          this.log('CoAP listener for gen1 LAN devices started.');
          shellies.start();
        } else {
          this.log('CoAP listener not started, the CoAP listener has been disabled from the app settings');
        }
      }
    }, 25000);

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

    this.homey.flow.getConditionCard('conditionInput3')
      .registerRunListener(async (args) => {
        if (args.device) {
          return args.device.getCapabilityValue("input_4");
        } else {
          return false;
        }
      })

    this.homey.flow.getActionCard('actionReboot')
      .registerRunListener(async (args) => {
        if (args.device.getStoreValue('communication') === 'websocket') {
          return await args.device.ws.send(JSON.stringify({"id": args.device.getCommandId(), "method": "Shelly.Reboot", "params": {"delay_ms": 0} }));
        } else if (args.device.getStoreValue('communication') === 'cloud') {
          return await this.util.sendCloudCommand('/device/reboot', args.device.getSetting('server_address'), args.device.getSetting('cloud_token'), args.device.getSetting('cloud_device_id'));
        } else {
          return await this.util.sendCommand('/reboot', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        }
      })

    this.homey.flow.getActionCard('actionOTAUpdate')
      .registerRunListener(async (args) => {
        return await this.util.sendCommand('/ota?update=true', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    this.homey.flow.getActionCard('flipbackSwitch')
      .registerRunListener(async (args) => {
        var onoff = args.switch === "1" ? 'on' : 'off';
        if (args.device.getStoreValue('communication') === 'websocket') {
          return await args.device.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Switch.Set", "params": {"id": this.getStoreValue('channel'), "on": onoff, "toggle": args.timer} }));
        } else if (args.device.getStoreValue('communication') === 'cloud') {
          return await this.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest-timer', command: 'relay', command_param: 'turn', command_value: onoff, timer_param: 'timeout', timer: args.timer, deviceid: args.device.getSetting('cloud_device_id'), channel: args.device.getStoreValue('channel')})]);
        } else {
          return await this.util.sendCommand('/relay/'+ args.device.getStoreValue('channel') +'?turn='+ onoff +'&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        }
      })

    this.homey.flow.getActionCard('onOffTransition')
      .registerRunListener(async (args) => {
        var onoff = args.switch === "1" ? 'on' : 'off';
        if (args.device.getStoreValue('communication') === 'websocket') {
          return await args.device.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Switch.Set", "params": {"id": this.getStoreValue('channel'), "on": onoff, "transition": args.transition} }));
        } else if (args.device.getStoreValue('communication') === 'cloud') {
          return await this.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest-timer', command: 'light', command_param: 'turn', command_value: onoff, timer_param: 'transition', timer: args.transition, deviceid: args.device.getSetting('cloud_device_id'), channel: args.device.getStoreValue('channel')})]);
        } else {
          return await this.util.sendCommand('/light/'+ args.device.getStoreValue('channel') +'?turn='+ onoff +'&transition='+ args.transition +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
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

    // SHELLY (PRO) 2(.5)(PM) ROLLER SHUTTER
    this.homey.flow.getActionCard('moveRollerShutter')
      .registerRunListener(async (args) => {
        if (args.direction == 'open') {
          args.device.setStoreValue('last_action', 'up');
          args.device.setCapabilityValue('windowcoverings_state','up');
          var gen2_method = 'Cover.Open';
        } else if (args.direction == 'close') {
          args.device.setStoreValue('last_action', 'down');
          args.device.setCapabilityValue('windowcoverings_state','down');
          var gen2_method = 'Cover.Close';
        }
        if (args.device.getStoreValue('communication') === 'websocket') {
          return await args.device.ws.send(JSON.stringify({"id": this.getCommandId(), "method": method, "params": {"id": this.getStoreValue('channel'), "duration": args.move_duration} }));
        } else {
          return await this.util.sendCommand('/roller/0?go='+ args.direction +'&duration='+ args.move_duration +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        }
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
          return await args.device.triggerCapabilityListener('windowcoverings_state', 'idle');
        } else if (args.device.getStoreValue('last_action') === 'up') {
          return await args.device.triggerCapabilityListener('windowcoverings_state', 'up');
        } else if (args.device.getStoreValue('last_action') === 'down') {
          return await args.device.triggerCapabilityListener('windowcoverings_state', 'down');
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
          return await args.device.triggerCapabilityListener('windowcoverings_set', position);
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

    // SHELLY TRV
    this.homey.flow.getConditionCard('conditionValveMode')
      .registerRunListener(async (args) => {
        if (args.profile.id === args.device.getCapabilityValue("valve_mode")) {
          return true;
        } else {
          return false;
        }
      })
      .getArgument('profile')
        .registerAutocompleteListener(async (query, args) => {
          return await this.util.getTrvProfiles(args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        })

    this.homey.flow.getActionCard('actionValvePosition')
      .registerRunListener(async (args) => {
        return await this.util.sendCommand('/thermostat/0?pos='+ args.position +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    this.homey.flow.getActionCard('actionValveMode')
      .registerRunListener(async (args) => {
        if (args.profile === "0") {
          return await this.util.sendCommand('/thermostat/0?schedule=false', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else {
          return await this.util.sendCommand('/thermostat/0?schedule=true&schedule_profile='+ args.profile.id +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        }
      })
      .getArgument('profile')
        .registerAutocompleteListener(async (query, args) => {
          return await this.util.getTrvProfiles(args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        })

    this.homey.flow.getActionCard('actionMeasuredExtTemp')
      .registerRunListener(async (args) => {
        return await this.util.sendCommand('/ext_t?temp='+ args.temperature +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    // COAP: COAP LISTENER FOR PROCESSING INCOMING MESSAGES
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

  // COAP & GEN2 WEBSOCKETS: RETURN PAIRED DEVICES
  async getShellyCollection() {
    return this.shellyDevices;
  }

  // CLOUD: OPEN WEBSOCKET FOR PROCESSING CLOUD DEVICES STATUS UPDATES
  async websocketCloudListener() {
    try {
      const client = await this.getFirstSavedOAuth2Client();
      const oauth_token = await client.getToken();
      this.cloudAccessToken = oauth_token.access_token;
      const cloud_details = await jwt_decode(oauth_token.access_token);
      this.cloudServer = cloud_details.user_api_url.replace('https://', '');

      if (this.ws == null || this.ws.readyState === WebSocket.CLOSED) {
        this.ws = new WebSocket('wss://'+ this.cloudServer +':6113/shelly/wss/hk_sock?t='+ this.cloudAccessToken, {perMessageDeflate: false});

        this.ws.on('open', () => {
          this.log('Websocket for oauth cloud devices opened.');
          this.wsConnected = true;

          // start sending pings every 2 minutes to check the connection status
          clearTimeout(this.wsPingInterval);
          this.wsPingInterval = this.homey.setInterval(() => {
            if (this.wsConnected === true && this.ws.readyState === WebSocket.OPEN) {
              this.ws.ping();
            }
          }, 120 * 1000);
        });

        this.ws.on('message', async (data) => {
          try {
            const result = JSON.parse(data);

            if (result.event === 'Shelly:StatusOnChange') {
              const device_id = result.device.id.toString(16); // convert regular device id to cloud device id to allow matching
              const filteredShellies = this.shellyDevices.filter(shelly => shelly.id.includes(device_id));
              for (const filteredShelly of filteredShellies) {
                if (result.device.gen === 'G1') {
                  filteredShelly.device.parseStatusUpdate(result.status);
                } else if (result.device.gen === 'G2') {
                  filteredShelly.device.parseStatusUpdateGen2(result.status);
                }
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
              this.websocketCloudListener();
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
          clearTimeout(this.wsPingInterval);
          this.wsConnected = false;

          // retry connection after 500 miliseconds
          clearTimeout(this.wsReconnectTimeout);
          this.wsReconnectTimeout = this.homey.setTimeout(async () => {
            this.websocketCloudListener();
          }, 500);
        });

      } else {
        throw new Error('No cloud server details yet.');
      }
    } catch (error) {
      if (error.message !== 'No OAuth2 Client Found') {
        clearTimeout(this.wsReconnectTimeout);
        this.wsReconnectTimeout = this.homey.setTimeout(async () => {
          if (!this.wsConnected) {
            this.websocketCloudListener(this.cloudAccessToken);
          }
        }, 5000);
      }
    }
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
        this.websocketCloudListener();
      } else if (this.wsConnected) {
        this.ws.close();
      }

      return Promise.reject(error);
    }
  }

  async onUninit() {
    clearTimeout(this.wsPingInterval);
    clearTimeout(this.wsPingTimeout);
    clearTimeout(this.wsReconnectTimeout);
    shellies.stop();
    if (this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close();
    }
  }

}

module.exports = ShellyApp;
