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
  static OAUTH2_DRIVERS = ['shelly-plug-s_cloud', 'shelly-plug_cloud', 'shelly-plus-1_cloud', 'shelly-plus-1pm_cloud', 'shelly-plus-2pm-rollershutter_cloud', 'shelly-plus-2pm_cloud', 'shelly-pro-1_cloud', 'shelly-pro-1pm_cloud', 'shelly-pro-2-rollershutter_cloud', 'shelly-pro-2_cloud', 'shelly-pro-2pm-rollershutter_cloud', 'shelly-pro-2pm_cloud', 'shelly1_cloud', 'shelly1l_cloud', 'shelly1pm_cloud', 'shelly2-rollershutter_cloud', 'shelly25-rollershutter_cloud', 'shelly25_cloud', 'shelly2_cloud', 'shelly3em_cloud', 'shelly4pro_cloud', 'shellyair_cloud', 'shellybulb_cloud', 'shellybutton1_cloud', 'shellydimmer_cloud', 'shellyduo_cloud', 'shellydw_cloud', 'shellyem_cloud', 'shellyflood_cloud', 'shellyht_cloud', 'shellyi3_cloud', 'shellyi4_cloud', 'shellymotion_cloud', 'shellyrgbw2color_cloud', 'shellyrgbw2white_cloud', 'shellysmoke_cloud', 'shellyuni_cloud', 'shellyvintage_cloud'];

  async onOAuth2Init() {
    this.log('Initializing Shelly App ...');

    if (!this.util) this.util = new Util({homey: this.homey});

    // VARIABLES GENERIC
    this.shellyDevices = [];

    // VARIABLES WEBSOCKET
    this.wss = null;

    // VARIABLES CLOUD
    this.cloudInstall = false;
    this.cloudServer = null;
    this.cloudAccessToken = null;
    this.ws = null;
    this.wsConnected = false;

    // CLOUD: OPEN CLOUD WEBSOCKET
    this.homey.setTimeout(() => {
      this.websocketCloudListener();
    }, 2000);

    // COAP, CLOUD & GEN2 WEBSOCKETS: INITIALLY UPDATE THE SHELLY COLLECTION FOR MATCHING INCOMING STATUS UPDATES
    this.homey.setTimeout(() => {
      this.updateShellyCollection();
    }, 15000);

    // COAP: START COAP LISTENER FOR RECEIVING STATUS UPDATES
    this.homey.setTimeout(async () => {
      let gen1 = await this.util.getDeviceType('gen1');
      if (gen1) {
        if (!this.homey.settings.get('general_coap')) {
          this.log('CoAP listener for gen1 LAN devices started.');
          shellies.start();
        } else {
          this.log('CoAP listener not started, the CoAP listener has been disabled from the app settings');
        }
      } else {
        this.log('CoAP listener not started as no gen 1 devices where found during app init');
      }
    }, 25000);

    // WEBSOCKET: INITIALLY START WEBSOCKET SERVER AND LISTEN FOR GEN2 UPDATES
    this.homey.setTimeout(async () => {
      let gen2 = await this.util.getDeviceType('gen2');
      if (gen2) {
        this.websocketLocalListener();
      } else {
        this.log('Websocket server for gen2 devices with outbound websockets not started as no gen2 devices where found during app init');
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
          ((state.id === args.shelly.id || args.shelly === undefined) && (state.action === action || args.action === undefined)) &&
          state.action !== 'n/a'
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
        try {
          switch(args.device.getStoreValue('communication')) {
            case 'coap': {
              return await this.util.sendCommand('/reboot', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
            }
            case 'websocket': {
              return await this.util.sendRPCCommand('/rpc/Shelly.Reboot', args.device.getSetting('address'), args.device.getSetting('password'));
            }
            case 'cloud': {
              // cloud does not support these commands
              break;
            }
          }
        } catch (error) {
          return Promise.reject(error);
        }
      })

    this.homey.flow.getActionCard('actionOTAUpdate')
      .registerRunListener(async (args) => {
        try {
          switch(args.device.getStoreValue('communication')) {
            case 'coap': {
              return await this.util.sendCommand('/ota?update=true', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
            }
            case 'websocket': {
              return await this.util.sendRPCCommand('/rpc/Shelly.Update', args.device.getSetting('address'), args.device.getSetting('password'));
            }
            case 'cloud': {
              // cloud does not support these commands
              break;
            }
          }
        } catch (error) {
          return Promise.reject(error);
        }
      })

    this.homey.flow.getActionCard('actionEcoMode')
      .registerRunListener(async (args) => {
        try {
          switch(args.device.getStoreValue('communication')) {
            case 'coap': {
              return await this.util.sendCommand('/settings?eco_mode_enabled='+ args.eco_mode, args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
            }
            case 'websocket': {
              const eco_mode = args.eco_mode === 'false' ? false : true;
              return await this.util.sendRPCCommand('/rpc', args.device.getSetting('address'), args.device.getSetting('password'), 'POST', {"id": args.device.getCommandId(), "method": "Sys.SetConfig", "params": {"config": {"device": {"eco_mode": eco_mode} } } });
            }
            case 'cloud': {
              // cloud does not support these commands
              break;
            }
          }
        } catch (error) {
          return Promise.reject(error);
        }
      })

    this.homey.flow.getActionCard('actionUpdateFirmware')
      .registerRunListener(async (args) => {
        try {
          const drivers = Object.values(this.homey.drivers.getDrivers());
          for (const driver of drivers) {
            const devices = driver.getDevices();
            for (const device of devices) {
              if (device.getStoreValue('channel') === 0 && device.getStoreValue('battery') === false) {
                switch (device.getStoreValue('communication')) {
                  case 'coap': {
                    const path = args.stage === 'stable' ? '/ota?update=true' : '/ota?update=true&beta=true';
                    await this.util.sendCommand(path, device.getSetting('address'), device.getSetting('username'), device.getSetting('password'));
                  }
                  case 'websocket': {
                    await this.util.sendRPCCommand('/rpc/Shelly.Update?stage='+ args.stage, device.getSetting('address'), device.getSetting('password'));
                  }
                  case 'default': {
                    break;
                  }
                }
              }
            }
            return Promise.resolve(true);
          }
        } catch (error) {
          return Promise.reject(error);
        }
      })

    this.homey.flow.getActionCard('flipbackSwitch')
      .registerRunListener(async (args) => {
        try {
          switch(args.device.getStoreValue('communication')) {
            case 'coap': {
              const onoff = args.switch === "1" ? 'on' : 'off';
              return await this.util.sendCommand('/relay/'+ args.device.getStoreValue('channel') +'?turn='+ onoff +'&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
            }
            case 'websocket': {
              const onoff = args.switch === "1" ? true : false;
              return await this.util.sendRPCCommand('/rpc/Switch.Set?id='+ args.device.getStoreValue('channel') +'&on='+ onoff +'&toggle_after='+ args.timer, args.device.getSetting('address'), args.device.getSetting('password'));
            }
            case 'cloud': {
              const onoff = args.switch === "1" ? true : false;
              return await this.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest-timer', command: 'relay', command_param: 'turn', command_value: onoff, timer_param: 'timeout', timer: args.timer, deviceid: args.device.getSetting('cloud_device_id'), channel: args.device.getStoreValue('channel')})]);
            }
          }
        } catch (error) {
          return Promise.reject(error);
        }
      })

    this.homey.flow.getActionCard('onOffTransition')
      .registerRunListener(async (args) => {
        try {
          switch(args.device.getStoreValue('communication')) {
            case 'coap': {
              const onoff = args.switch === "1" ? 'on' : 'off';
              return await this.util.sendCommand('/light/'+ args.device.getStoreValue('channel') +'?turn='+ onoff +'&transition='+ args.transition +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
            }
            case 'websocket': {
              const onoff = args.switch === "1" ? true : false;
              return await this.util.sendRPCCommand('/rpc/Switch.Set?id='+ args.device.getStoreValue('channel') +'&on='+ onoff +'&transition='+ args.transition, args.device.getSetting('address'), args.device.getSetting('password'));
            }
            case 'cloud': {
              const onoff = args.switch === "1" ? true : false;
              return await this.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest-timer', command: 'light', command_param: 'turn', command_value: onoff, timer_param: 'transition', timer: args.transition, deviceid: args.device.getSetting('cloud_device_id'), channel: args.device.getStoreValue('channel')})]);
            }
          }
        } catch (error) {
          return Promise.reject(error);
        }
      })

    // SHELLY RGBW2
    this.homey.flow.getActionCard('effectRGBW2Color')
      .registerRunListener(async (args) => {
        try {
          return await this.util.sendCommand('/color/0?turn=on&effect='+ Number(args.effect) +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } catch (error) {
          return Promise.reject(error);
        }
      })

    this.homey.flow.getActionCard('actionRGBW2EnableWhiteMode')
      .registerRunListener(async (args) => {
        try {
          return await args.device.triggerCapabilityListener("onoff.whitemode", true);
        } catch (error) {
          return Promise.reject(error);
        }
      })

    this.homey.flow.getActionCard('actionRGBW2DisableWhiteMode')
      .registerRunListener(async (args) => {
        try {
          return await args.device.triggerCapabilityListener("onoff.whitemode", false);
        } catch (error) {
          return Promise.reject(error);
        }
      })

    // ROLLER SHUTTERS
    this.homey.flow.getActionCard('moveRollerShutter')
      .registerRunListener(async (args) => {
        try {
          if (args.direction == 'open') {
            args.device.setStoreValue('last_action', 'up');
            args.device.setCapabilityValue('windowcoverings_state','up');
            var gen2_method = 'Cover.Open';
          } else if (args.direction == 'close') {
            args.device.setStoreValue('last_action', 'down');
            args.device.setCapabilityValue('windowcoverings_state','down');
            var gen2_method = 'Cover.Close';
          }
          switch(args.device.getStoreValue('communication')) {
            case 'coap': {
              return await this.util.sendCommand('/roller/0?go='+ args.direction +'&duration='+ args.move_duration +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
            }
            case 'websocket': {
              return await this.util.sendRPCCommand('/rpc/'+ gen2_method +'?id='+ args.device.getStoreValue('channel') +'&duration='+ args.move_duration, args.device.getSetting('address'), args.device.getSetting('password'));
            }
            case 'cloud': {
              return await this.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest-timer', command: 'roller', command_param: 'go', command_value: args.direction, timer_param: 'duration', timer: args.move_duration, deviceid: args.device.getSetting('cloud_device_id'), channel: args.device.getStoreValue('channel')})]);
            }
          }
        } catch (error) {
          return Promise.reject(error);
        }
      })

    this.homey.flow.getActionCard('moveRollerShutterOffset')
      .registerRunListener(async (args) => {
        try {
          if (args.direction == 'open') {
            args.device.setStoreValue('last_action', 'up');
            args.device.setCapabilityValue('windowcoverings_state','up');
          } else if (args.direction == 'close') {
            args.device.setStoreValue('last_action', 'down');
            args.device.setCapabilityValue('windowcoverings_state','down');
          }
          return await this.util.sendCommand('/roller/0?go='+ args.direction +'&offset='+ args.offset +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } catch (error) {
          return Promise.reject(error);
        }
      })

    this.homey.flow.getActionCard('rollerShutterIntelligentAction')
      .registerRunListener(async (args) => {
        try {
          if (args.device.getCapabilityValue('windowcoverings_state') !== 'idle') {
            return await args.device.triggerCapabilityListener('windowcoverings_state', 'idle');
          } else if (args.device.getStoreValue('last_action') === 'up') {
            return await args.device.triggerCapabilityListener('windowcoverings_state', 'down');
          } else if (args.device.getStoreValue('last_action') === 'down') {
            return await args.device.triggerCapabilityListener('windowcoverings_state', 'up');
          } else {
            return Promise.reject('Invalid state');
          }
        } catch (error) {
          return Promise.reject(error);
        }
      })

    this.homey.flow.getActionCard('moveRollerShutterPreviousPosition')
      .registerRunListener(async (args) => {
        try {
          let position = args.device.getStoreValue('previous_position');
          if (position == undefined) {
  			    return Promise.reject('previous position has not been set yet');
  		    } else {
            return await args.device.triggerCapabilityListener('windowcoverings_set', position);
          }
        } catch (error) {
          return Promise.reject(error);
        }
  	  })

    // SHELLY GAS
    this.homey.flow.getActionCard('actionGasSetVolume')
      .registerRunListener(async (args) => {
        try {
          return await this.util.sendCommand('/settings/?set_volume='+ args.volume +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } catch (error) {
          return Promise.reject(error);
        }
      })

    this.homey.flow.getActionCard('actionGasMute')
      .registerRunListener(async (args) => {
        try {
          return await this.util.sendCommand('/mute', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } catch (error) {
          return Promise.reject(error);
        }
      })

    this.homey.flow.getActionCard('actionGasUnmute')
      .registerRunListener(async (args) => {
        try {
          return await this.util.sendCommand('/unmute', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } catch (error) {
          return Promise.reject(error);
        }
      })

    this.homey.flow.getActionCard('actionGasTest')
      .registerRunListener(async (args) => {
        try {
          return await this.util.sendCommand('/self_test', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } catch (error) {
          return Promise.reject(error);
        }
      })

    // SHELLY TRV
    this.homey.flow.getConditionCard('conditionValveMode')
      .registerRunListener(async (args) => {
        try {
          if (args.profile.id === args.device.getCapabilityValue("valve_mode")) {
            return true;
          } else {
            return false;
          }
        } catch (error) {
          return Promise.reject(error);
        }
      })
      .getArgument('profile')
        .registerAutocompleteListener(async (query, args) => {
          return await this.util.getTrvProfiles(args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        })

    this.homey.flow.getActionCard('actionValvePosition')
      .registerRunListener(async (args) => {
        try {
          return await this.util.sendCommand('/thermostat/0?pos='+ args.position +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } catch (error) {
          return Promise.reject(error);
        }
      })

    this.homey.flow.getActionCard('actionValveMode')
      .registerRunListener(async (args) => {
        try {
          if (args.profile === "0") {
            return await this.util.sendCommand('/thermostat/0?schedule=false', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } else {
            return await this.util.sendCommand('/thermostat/0?schedule=true&schedule_profile='+ args.profile.id +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          }
        } catch (error) {
          return Promise.reject(error);
        }
      })
      .getArgument('profile')
        .registerAutocompleteListener(async (query, args) => {
          return await this.util.getTrvProfiles(args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        })

    this.homey.flow.getActionCard('actionMeasuredExtTemp')
      .registerRunListener(async (args) => {
        try {
          return await this.util.sendCommand('/ext_t?temp='+ args.temperature +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } catch (error) {
          return Promise.reject(error);
        }
      })

    // COAP: COAP LISTENER FOR PROCESSING INCOMING MESSAGES
    shellies.on('discover', device => {
      this.log('Discovered device with ID', device.id, 'and type', device.type, 'with IP address', device.host);

      device.on('change', (prop, newValue, oldValue) => {
        try {
          //console.log(prop, 'changed from', oldValue, 'to', newValue, 'for device', device.id, 'with IP address', device.host);
          if (this.shellyDevices.length > 0) {
            const filteredShelliesCoap = this.shellyDevices.filter(shelly => shelly.id.includes(device.id)); // filter total device collection based on incoming device id
            let coap_device_id;
            let coap_device;
            if (filteredShelliesCoap.length > 0) {
              if (filteredShelliesCoap.length === 1) {
                coap_device = filteredShelliesCoap[0].device; // when there is 1 filtered device it's not multi channel
              } else {
                const channel = prop.slice(prop.length - 1);
                if(isNaN(channel)) {
                  coap_device_id = filteredShelliesCoap[0].main_device+'-channel-0'; // when the capability does not have a ending channel number it's targeted at channel 0
                } else {
                  coap_device_id = filteredShelliesCoap[0].main_device+'-channel-'+channel; // when the capability does have a ending channel number set it to the correct channel
                }
                const filteredShellyCoap = filteredShelliesCoap.filter(shelly => shelly.id.includes(coap_device_id)); // filter the filtered shellies with the correct channel device id
                coap_device = filteredShellyCoap[0].device;
              }
              coap_device.parseCapabilityUpdate(prop, newValue);
              if (coap_device.getSetting('address') !== device.host) {
                coap_device.setSettings({address: device.host});
              }
              return;
            }
          }
        } catch (error) {
          this.error('Error processing CoAP message for device', device.id, 'of type', device.type, 'with IP address', device.host, 'on capability', prop, 'with old value', oldValue, 'to new value', newValue);
          this.error(error);
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
          this.error(error);
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
      this.error(error);
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
      this.error(error);
      return Promise.reject(error);
    }
  }

  // COAP & GEN2 WEBSOCKETS: RETURN PAIRED DEVICES
  async getShellyCollection() {
    return this.shellyDevices;
  }

  // WEBSOCKET: START WEBSOCKET SERVER AND LISTEN FOR GEN2 UPDATES
  async websocketLocalListener() {
    try {
      if (this.wss === null) {
        this.wss = new WebSocket.Server({ port: 6113 });
        this.log('Websocket server for gen2 devices with outbound websockets started');
        this.wss.on("connection", (wsserver, req) => {

          wsserver.send('{"jsonrpc":"2.0", "id":1, "src":"wsserver-getdeviceinfo", "method":"Shelly.GetDeviceInfo"}');

          wsserver.on("message", async (data) => {
            const result = JSON.parse(data);
            if (result.hasOwnProperty('method')) {
              if (result.method === 'NotifyFullStatus') { // parse full status updates
                const filteredShelliesWss = this.shellyDevices.filter(shelly => shelly.id.toLowerCase().includes(result.src));
                for (const filteredShellyWss of filteredShelliesWss) {
                  if (result.hasOwnProperty("params")) {
                    filteredShellyWss.device.parseStatusUpdateGen2(result.params);
                  }
                }
              }
            } else if (result.dst === 'wsserver-getdeviceinfo') { // parse device info request after each (re)connect
              const filteredShelliesWss = this.shellyDevices.filter(shelly => shelly.id.toLowerCase().includes(result.src));
              for (const filteredShellyWss of filteredShelliesWss) {
                if (result.hasOwnProperty("result")) {
                  filteredShellyWss.device.setStoreValue('type', result.result.model);
                  filteredShellyWss.device.setStoreValue('fw_version', result.result.ver);
                }
              }
            }
          });
        });

        this.wss.on('error', (error) => {
          this.error('Websocket Server error:', error);
          this.wss.close();
        });

        this.wss.on('close', (code, reason) => {
          this.error('Websocket Server closed due to reasoncode:', code);

          // retry connection after 500 miliseconds
          clearTimeout(this.wssReconnectTimeout);
          this.wssReconnectTimeout = this.homey.setTimeout(async () => {
            this.websocketLocalListener();
          }, 500);
        });
      }
    } catch (error) {
      clearTimeout(this.wssReconnectTimeout);
      this.wssReconnectTimeout = this.homey.setTimeout(async () => {
        this.websocketLocalListener();
      }, 5000);
    }
  }

  // CLOUD: OPEN CLOUD WEBSOCKET FOR PROCESSING CLOUD DEVICES STATUS UPDATES
  async websocketCloudListener() {
    try {
      if (this.ws == null || this.ws.readyState === WebSocket.CLOSED) {
        const client = await this.getFirstSavedOAuth2Client();
        const oauth_token = await client.getToken();
        this.cloudAccessToken = oauth_token.access_token;
        const cloud_details = await jwt_decode(oauth_token.access_token);
        this.cloudServer = cloud_details.user_api_url.replace('https://', '');

        this.ws = new WebSocket('wss://'+ this.cloudServer +':6113/shelly/wss/hk_sock?t='+ this.cloudAccessToken, {perMessageDeflate: false});

        this.ws.on('open', () => {
          this.log('Cloud websocket for cloud devices opened');
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
              const ws_device_id = result.device.id.toString(16);
              const filteredShelliesWs = this.shellyDevices.filter(shelly => shelly.id.includes(ws_device_id));
              for (const filteredShellyWs of filteredShelliesWs) {
                if (result.hasOwnProperty("status")) {
                  if (result.device.gen === 'G1') {
                    filteredShellyWs.device.parseStatusUpdate(result.status);
                  } else if (result.device.gen === 'G2') {
                    filteredShellyWs.device.parseStatusUpdateGen2(result.status);
                  }
                }
                await this.util.sleep(250);
              }
            }

          } catch (error) {
            this.error(error);
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
          this.error('Cloud websocket error:', error);
          this.ws.close();
        });

        this.ws.on('close', (code, reason) => {
          this.error('Cloud websocket closed due to reasoncode:', code);
          clearTimeout(this.wsPingInterval);
          this.wsConnected = false;

          // retry connection after 500 miliseconds
          clearTimeout(this.wsReconnectTimeout);
          this.wsReconnectTimeout = this.homey.setTimeout(async () => {
            this.websocketCloudListener();
          }, 500);
        });

      }
    } catch (error) {
      if (error.message !== 'No OAuth2 Client Found') {
        clearTimeout(this.wsReconnectTimeout);
        this.wsReconnectTimeout = this.homey.setTimeout(async () => {
          if (!this.wsConnected) {
            this.websocketCloudListener();
          }
        }, 5000);
      } else {
        this.log('Cloud websocket for cloud devices not opened as no oauth2 clients (cloud connected device) where found');
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
      this.error('Websocket error sending command');
      this.error(error);

      if (this.ws === null || this.ws.readyState === WebSocket.CLOSED) {
        this.wsConnected = false;
        this.websocketCloudListener();
      } else if (this.wsConnected) {
        this.ws.close();
      }

      return Promise.reject(error);
    }
  }

  // CLOUD: CLOSE WEBSOCKET IF NOT NEEDED
  async websocketClose() {
    try {
      const filteredShellies = this.shellyDevices.filter(shelly => shelly.communication.includes('cloud'));
      if (filteredShellies.length === 0) {
        this.log('Closing websocket because there are no more cloud devices paired');
        this.ws.close();
      }
      return Promise.resolve(true);
    } catch (error) {
      this.error(error);
      return Promise.reject(error);
    }
  }

  async onUninit() {
    clearTimeout(this.wsPingInterval);
    clearTimeout(this.wsPingTimeout);
    clearTimeout(this.wsReconnectTimeout);
    clearTimeout(this.wssReconnectTimeout);
    shellies.stop();
    if (this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close();
    }
  }

}

module.exports = ShellyApp;
