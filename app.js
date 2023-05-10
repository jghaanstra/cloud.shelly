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
  static OAUTH2_DRIVERS = ['shelly_cloud', 'shelly-plug-s_cloud', 'shelly-plug_cloud', 'shelly1_cloud', 'shelly1l_cloud', 'shelly1pm_cloud', 'shelly2-rollershutter_cloud', 'shelly25-rollershutter_cloud', 'shelly25_cloud', 'shelly2_cloud', 'shelly3em_cloud', 'shellybulb_cloud', 'shellydimmer_cloud', 'shellyduo_cloud', 'shellyem_cloud', 'shellyi3_cloud', 'shellyrgbw2color_cloud', 'shellyrgbw2white_cloud', 'shellyuni_cloud', 'shellyvintage_cloud'];

  async onOAuth2Init() {
    try {
      this.log('Initializing Shelly App ...');

      if (!this.util) this.util = new Util({homey: this.homey});
  
      // VARIABLES GENERIC
      this.shellyDevices = [];
  
      // VARIABLES WEBSOCKET GEN2
      this.wss = null;
  
      // VARIABLES CLOUD GEN1 & GEN2
      this.cloudServer = null;
      this.cloudAccessToken = null;
      this.ws = null;
      this.wsConnected = false;
      this.debouncer = 0;
  
      // ALL: INITIALLY UPDATE THE SHELLY COLLECTION FOR MATCHING INCOMING STATUS UPDATES
      this.homey.setTimeout(async () => {
        await this.updateShellyCollection();
        this.log('Shelly collection has been updated ...');
      }, 15000);
  
      // COAP GEN1: START COAP LISTENER FOR RECEIVING STATUS UPDATES
      if (this.homey.platform !== "cloud") {
        this.homey.setTimeout(async () => {
          let gen1 = await this.util.getDeviceType('gen1');
          if (gen1) {
            shellies.start();
            this.log('CoAP listener for gen1 LAN devices started ...');
          } else {
            this.log('CoAP listener not started as no gen 1 devices where found during app init ...');
          }
        }, 20000);
      }
      
      // WEBSOCKET GEN2: INITIALLY START WEBSOCKET SERVER AND LISTEN FOR GEN2 UPDATES
      if (this.homey.platform !== "cloud") {
        this.homey.setTimeout(async () => {
          let gen2 = await this.util.getDeviceType('gen2');
          if (gen2) {
            this.websocketLocalListener();
          } else {
            this.log('Websocket server for gen2 devices with outbound websockets not started as no gen2 devices where found during app init ...');
          }
        }, 25000);
      }

      // BLUETOOTH GEN2: LISTEN FOR BLE ADVERTISEMENTS
      // TODO: This isnt actived as it works flaky due to Homey's Bluetoooth implementation
      // if (this.homey.platform !== "cloud") {
      //   this.homey.setTimeout(async () => {
      //     let bluetooth = await this.util.getDeviceType('bluetooth');
      //     if (bluetooth) {
      //       this.bluetoothListener();
      //     } else {
      //       this.log('BLE listener not started as no Bluetooth devices have been paired ...');
      //     }
      //   }, 27000);
      // }
  
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
            ((state.id === args.shelly.id || args.shelly === undefined) && (state.action === action || args.action === undefined)) && state.action !== 'n/a' && state.action !== 'n/a_1' && state.action !== 'n/a_2' && state.action !== 'n/a_3' && state.action !== 'n/a_4'
          ) {
            return Promise.resolve(true);
          } else {
            return Promise.resolve(false);
          }
        } catch (error) {
          this.error(error)
        }
      });
      listenerCallbacks.getArgument('shelly').registerAutocompleteListener(async (query, args) => {
        return await this.util.getShellies('flowcard');
      });
      listenerCallbacks.getArgument('action').registerAutocompleteListener(async (query, args) => {
        try {
          return await this.util.getActions(args.shelly.actions);
        } catch (error) {
          this.error(error)
        }
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

      this.homey.flow.getConditionCard('conditionBeacon')
        .registerRunListener(async (args) => {
          if (args.device) {
            return args.device.getCapabilityValue("beacon");
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
            this.error(error)
          }
        })

      this.homey.flow.getActionCard('actionCustomCommand')
        .registerRunListener(async (args) => {
          try {
            switch(args.device.getStoreValue('communication')) {
              case 'coap': {
                return await this.util.sendCommand('/'+ args.command, args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
              }
              case 'websocket': {
                return await this.util.sendRPCCommand('/rpc/'+ args.command, args.device.getSetting('address'), args.device.getSetting('password'));
              }
              case 'cloud': {
                // cloud does not support these commands
                break;
              }
            }
          } catch (error) {
            this.error(error)
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
            this.error(error)
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
            this.error(error)
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
            this.error(error)
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
            this.error(error)
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
            this.error(error)
          }
        })

      this.homey.flow.getActionCard('actionColorEffect') 
      .registerRunListener(async (args) => {
        try {
          return await this.util.sendCommand('/color/0?turn=on&effect='+ args.effect +'&duration='+ args.duration, args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } catch (error) {
          this.error(error)
        }
      })
  
      // SHELLY RGBW2
      this.homey.flow.getActionCard('effectRGBW2Color') /* deprecated and replaced by more generic actionColorEffect */
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendCommand('/color/0?turn=on&effect='+ Number(args.effect) +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error)
          }
        })
  
      this.homey.flow.getActionCard('actionRGBW2EnableWhiteMode')
        .registerRunListener(async (args) => {
          try {
            return await args.device.triggerCapabilityListener("onoff.whitemode", true);
          } catch (error) {
            this.error(error)
          }
        })
  
      this.homey.flow.getActionCard('actionRGBW2DisableWhiteMode')
        .registerRunListener(async (args) => {
          try {
            return await args.device.triggerCapabilityListener("onoff.whitemode", false);
          } catch (error) {
            this.error(error)
          }
        })
  
      // ROLLER SHUTTERS
      this.homey.flow.getActionCard('moveRollerShutter')
        .registerRunListener(async (args) => {
          try {
            if (args.direction == 'open') {
              args.device.setStoreValue('last_action', 'up');
              args.device.updateCapabilityValue('windowcoverings_state','up');
              var gen2_method = 'Cover.Open';
              var cloud_direction = 'up';
            } else if (args.direction == 'close') {
              args.device.setStoreValue('last_action', 'down');
              args.device.updateCapabilityValue('windowcoverings_state','down');
              var gen2_method = 'Cover.Close';
              var cloud_direction = 'down';
            }
            switch(args.device.getStoreValue('communication')) {
              case 'coap': {
                return await this.util.sendCommand('/roller/0?go='+ args.direction +'&duration='+ args.move_duration +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
              }
              case 'websocket': {
                return await this.util.sendRPCCommand('/rpc/'+ gen2_method +'?id='+ args.device.getStoreValue('channel') +'&duration='+ args.move_duration, args.device.getSetting('address'), args.device.getSetting('password'));
              }
              case 'cloud': {
                return await this.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest-timer', command: 'roller', command_param: 'go', command_value: cloud_direction, timer_param: 'duration', timer: args.move_duration, deviceid: args.device.getSetting('cloud_device_id'), channel: args.device.getStoreValue('channel')})]);
              }
            }
          } catch (error) {
            this.error(error)
          }
        })
  
      this.homey.flow.getActionCard('moveRollerShutterOffset')
        .registerRunListener(async (args) => {
          try {
            if (args.direction == 'open') {
              args.device.setStoreValue('last_action', 'up');
              args.device.updateCapabilityValue('windowcoverings_state','up');
            } else if (args.direction == 'close') {
              args.device.setStoreValue('last_action', 'down');
              args.device.updateCapabilityValue('windowcoverings_state','down');
            }
            return await this.util.sendCommand('/roller/0?go='+ args.direction +'&offset='+ args.offset +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error)
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
            this.error(error)
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
            this.error(error)
          }
        })
  
      // SHELLY GAS
      this.homey.flow.getActionCard('actionGasSetVolume')
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendCommand('/settings/?set_volume='+ args.volume +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error)
          }
        })
  
      this.homey.flow.getActionCard('actionGasMute')
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendCommand('/mute', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error)
          }
        })
  
      this.homey.flow.getActionCard('actionGasUnmute')
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendCommand('/unmute', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error)
          }
        })
  
      this.homey.flow.getActionCard('actionGasTest')
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendCommand('/self_test', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error)
          }
        })

      // PLUS SMOKE
      this.homey.flow.getActionCard('actionSmokeMute')
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendRPCCommand('/rpc/Smoke.Mute?id='+ args.device.getStoreValue('channel'), args.device.getSetting('address'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error)
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
            this.error(error)
          }
        })
        .getArgument('profile')
          .registerAutocompleteListener(async (query, args) => {
            try {
              return await this.util.getTrvProfiles(args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
            } catch (error) {
              this.error(error)
            }
          })
  
      this.homey.flow.getActionCard('actionValvePosition')
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendCommand('/thermostat/0?pos='+ args.position +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error)
          }
        })
  
      this.homey.flow.getActionCard('actionValveMode')
        .registerRunListener(async (args) => {
          try {
            if (args.profile.id === "0") {
              return await this.util.sendCommand('/thermostat/0?schedule=false', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
            } else {
              return await this.util.sendCommand('/thermostat/0?schedule=true&schedule_profile='+ args.profile.id +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
            }
          } catch (error) {
            this.error(error)
          }
        })
        .getArgument('profile')
          .registerAutocompleteListener(async (query, args) => {
            try {
              return await this.util.getTrvProfiles(args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
            } catch (error) {
              this.error(error)
            }
          })
  
      this.homey.flow.getActionCard('actionMeasuredExtTemp')
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendCommand('/ext_t?temp='+ args.temperature +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error)
          }
        })
      
      // EM & 3EM
      this.homey.flow.getActionCard('actionSetCumulative')
      .registerRunListener(async (args) => {
        try {
          return await args.device.setEnergy({ cumulative: args.cumulative });
        } catch (error) {
          this.error(error)
        }
      })

      this.homey.flow.getActionCard('actionResetTotals')
      .registerRunListener(async (args) => {
        try {
          return await this.util.sendCommand('/emeter/'+ args.device.getStoreValue('channel') +'?reset_totals=true', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } catch (error) {
          this.error(error)
        }
      })
  
      // COAP GEN1: COAP LISTENER FOR PROCESSING INCOMING MESSAGES
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
  
      });
    } catch (error) {
      this.log(error);
    }
  }

  // COAP GEN1 & WEBSOCKET GEN 2: UPDATE APP SETTINGS AND START/STOP POLLING
  async updateSettings(settings) {
    try {
      if (settings.general_polling) {
        this.log('Polling has been disabled from the app settings and the polling interval is now cleared');
        this.shellyDevices.forEach((device) => {
          this.homey.clearInterval(device.device.pollingInterval);
        });
        return Promise.resolve(true);
      } else {
        this.log('Polling has been enabled from the app settings and polling interval is now set');
        this.shellyDevices.forEach((device) => {
          device.device.pollingInterval = this.homey.setInterval(() => {
            if (!device.device.getStoreValue('battery')) {
              device.device.pollDevice();
            }
          }, (60000 + this.util.getRandomTimeout(20)));
        });
        return Promise.resolve(true);
      }
    } catch(error) {
      this.error(error);
    }
  }

  // WEBSOCKET GEN2: START WEBSOCKET SERVER AND LISTEN FOR INBOUND GEN2 UPDATES
  async websocketLocalListener() {
    try {
      if (this.wss === null) {
        this.wss = new WebSocket.Server({ port: 6113 });
        this.log('Websocket server for gen2 devices with outbound websockets started ...');
        this.wss.on("connection", async (wsserver, req) => {

          wsserver.send('{"jsonrpc":"2.0", "id":1, "src":"wsserver-getdeviceinfo_onconnect", "method":"Shelly.GetDeviceInfo"}');
          await this.util.sleep(1000);
          wsserver.send('{"jsonrpc":"2.0", "id":1, "src":"wsserver-getfullstatus_onconnect", "method":"Shelly.GetStatus"}');

          wsserver.on("message", async (data) => {
            const result = JSON.parse(data);
            if (result.hasOwnProperty('method') && result.hasOwnProperty("params")) {
              if (result.method === 'NotifyFullStatus') { // parse full status updates
                const filteredShelliesWss = this.shellyDevices.filter(shelly => shelly.id.toLowerCase().includes(result.src)).filter(shelly => shelly.channel === 0);
                for (const filteredShellyWss of filteredShelliesWss) {
                  filteredShellyWss.device.parseFullStatusUpdateGen2(result.params);
                  if (result.params.wifi.sta_ip !== null) { // update IP address if it does not match the device
                    if (filteredShellyWss.device.getSetting('address') !== String(result.params.wifi.sta_ip)) {
                      filteredShellyWss.device.setSettings({address: String(result.params.wifi.sta_ip)});
                    }
                  }
                }
              } else if (result.method === 'NotifyStatus') { // parse single component updates
                const filteredShelliesWss = this.shellyDevices.filter(shelly => shelly.id.toLowerCase().includes(result.src)).filter(shelly => shelly.channel === 0);
                for (const filteredShellyWss of filteredShelliesWss) {
                  filteredShellyWss.device.parseSingleStatusUpdateGen2(result);
                }
              } else if (result.method === 'NotifyEvent') { // parse events not reflected in the status of a component including BLE Proxy events
                for (const single_event of result.params.events) {
                  if (single_event.event === 'NotifyBluetoothStatus') {
                    const filteredShelliesWss = this.shellyDevices.filter(shelly => shelly.id.toLowerCase().includes(single_event.data.addr)).filter(shelly => shelly.channel === 0);
                    for (const filteredShellyWss of filteredShelliesWss) {
                      filteredShellyWss.device.parseBluetoothEvents(single_event.data);
                    }
                  } else {
                    const filteredShelliesWss = this.shellyDevices.filter(shelly => shelly.id.toLowerCase().includes(result.src)).filter(shelly => shelly.channel === 0);
                    for (const filteredShellyWss of filteredShelliesWss) {
                      filteredShellyWss.device.parseSingleStatusUpdateGen2(result);
                    }
                  }
                }
              }
            } else if (result.dst === 'wsserver-wsserver-getdeviceinfo_onconnect') { // parse device info request after each (re)connect
              const filteredShelliesWss = this.shellyDevices.filter(shelly => shelly.id.toLowerCase().includes(result.src));
              for (const filteredShellyWss of filteredShelliesWss) {
                if (result.hasOwnProperty("result")) {
                  filteredShellyWss.device.setStoreValue('type', result.result.model);
                  filteredShellyWss.device.setStoreValue('fw_version', result.result.ver);
                }
              }
            } else if (result.dst === 'wsserver-getfullstatus_onconnect') { // parse full initial status updates after each (re)connect
              const filteredShelliesWss = this.shellyDevices.filter(shelly => shelly.id.toLowerCase().includes(result.src)).filter(shelly => shelly.channel === 0);
              for (const filteredShellyWss of filteredShelliesWss) {
                filteredShellyWss.device.parseFullStatusUpdateGen2(result.result);
                if (result.result.wifi.sta_ip !== null) { // update IP address if it does not match the device
                  if (filteredShellyWss.device.getSetting('address') !== String(result.result.wifi.sta_ip)) {
                    filteredShellyWss.device.setSettings({address: String(result.result.wifi.sta_ip)});
                  }
                }
              }
            }
          });
        });

        this.wss.on('error', (error) => {
          this.error('Websocket Server error:', error);
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
        const client = this.getFirstSavedOAuth2Client();
        const oauth_token = client.getToken();
        this.cloudAccessToken = oauth_token.access_token;
        const cloud_details = await jwt_decode(oauth_token.access_token);
        this.cloudServer = cloud_details.user_api_url.replace('https://', '');

        this.debouncer++;

        this.ws = new WebSocket('wss://'+ this.cloudServer +':6113/shelly/wss/hk_sock?t='+ this.cloudAccessToken, {perMessageDeflate: false});

        this.ws.on('open', () => {
          this.log('Cloud websocket for cloud devices opened ...');
          this.wsConnected = true;
          this.debouncer = 0;

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
              if (result.device.gen !== 'GBLE') {
                var ws_device_id = Number(result.device.id).toString(16);
              } else {
                var ws_device_id = result.device.id;
              }
              const filteredShelliesWs = this.shellyDevices.filter(shelly => shelly.id.includes(ws_device_id));
              for (const filteredShellyWs of filteredShelliesWs) {
                if (result.hasOwnProperty("status")) {
                  if (result.device.gen === 'G1') {
                    filteredShellyWs.device.parseFullStatusUpdateGen1(result.status);
                  } else if (result.device.gen === 'G2' || result.device.gen === 'GBLE') {
                    filteredShellyWs.device.parseFullStatusUpdateGen2(result.status);
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
          this.error('Cloud websocket error:', error.message);
          this.error(error);
        });

        this.ws.on('close', (code, reason) => {
          this.error('Cloud websocket closed due to reasoncode:', code);
          clearTimeout(this.wsPingInterval);
          clearTimeout(this.wsReconnectTimeout);
          this.wsConnected = false;

          if (code !== 1006) {
            // retry connection after 30 seconds and if not retried 10 times already
            if (this.debouncer < 10) {
              this.wsReconnectTimeout = this.homey.setTimeout(async () => {
                this.websocketCloudListener();
              }, 30000);
            } else {
              this.wsReconnectTimeout = this.homey.setTimeout(async () => {
                this.websocketCloudListener();
              }, 600000);
            }
          }          
        });

      }
    } catch (error) {
      this.log(error);
      clearTimeout(this.wsReconnectTimeout);
      if (error.message !== 'No OAuth2 Client Found') {
        if (this.debouncer < 10) {
          this.wsReconnectTimeout = this.homey.setTimeout(async () => {
            if (!this.wsConnected) {
              this.websocketCloudListener();
            }
          }, 30000);
        } else {
          this.wsReconnectTimeout = this.homey.setTimeout(async () => {
            if (!this.wsConnected) {
              this.websocketCloudListener();
            }
          }, 600000);
        }
      } else {
        this.log('Cloud websocket for cloud devices not opened as no oauth2 clients (cloud connected device) where found ...');
      }
    }
  }

  // BLUETOOTH: CONTINUOSLY LISTEN FOR BLE ADVERTISEMENTS
  async bluetoothListener() {
    try {
      this.log('Bluetooth listener started ...');
      clearTimeout(this.bleInterval);
      this.bleInterval = this.homey.setInterval(async () => {
        const advertisements = await this.homey.ble.discover().catch(this.error);
        advertisements.forEach(advertisement => {
          if (this.util.filterBLEDevices(advertisement.localName)) {
            const filteredShelliesWss = this.shellyDevices.filter(shelly => shelly.id.includes(advertisement.address)).filter(shelly => shelly.channel === 0);
            for (const filteredShellyWss of filteredShelliesWss) {
              filteredShellyWss.device.parseBluetoothAdvertisement(advertisement);
            }
          }
        });
      }, 5000);
    } catch (error) {
      this.error(error);
    }
  }

  // COAP GEN1: (RE)START LISTENER
  async restartCoapListener() {
    try {
      this.log('CoAP listener for gen1 LAN devices (re)started after adding a device ...');
      if (shellies !== null) {
        shellies.stop();
      }
      this.homey.setTimeout(async () => {
        shellies.start();
      }, 1000);
      return Promise.resolve(true);
    } catch (error) {
      this.error(error)
    }
  }

  // CLOUD GEN1 & GEN2: SEND COMMANDS OVER WEBSOCKET
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
        clearTimeout(this.wsReconnectTimeout);
        clearTimeout(this.wsPingInterval);
        this.websocketCloudListener();
      } else if (this.wsConnected) {
        this.ws.close();
      }
    }
  }

  // CLOUD GEN1 & GEN2: CLOSE WEBSOCKET IF NOT NEEDED
  async websocketClose() {
    try {
      const filteredShellies = this.shellyDevices.filter(shelly => shelly.communication.includes('cloud'));
      if (filteredShellies.length === 0) {
        if (this.ws !== null && this.ws.readyState !== WebSocket.CLOSED) {
          this.log('Closing websocket because there are no more cloud devices paired');
          this.ws.close();
        }
      }
      return Promise.resolve(true);
    } catch (error) {
      this.error(error);
    }
  }

  // BLUETOOTH: STOP LISTENER IF NOT NEEDED
  async bluetoothListenerClose() {
    try {
      const filteredShellies = this.shellyDevices.filter(shelly => shelly.communication.includes('bluetooth'));
      if (filteredShellies.length === 0) {
        this.log('Stopping BLE listener because there are no more Bluetooth devices paired');
        this.homey.clearInterval(this.bleInterval);
      }
      return Promise.resolve(true);
    } catch (error) {
      this.error(error);
    }
  }

  // ALL: UPDATE COLLECTION OF DEVICES
  async updateShellyCollection() {
    try {
      this.shellyDevices = await this.util.getShellies('collection');
      return Promise.resolve(true);
    } catch(error) {
      this.error(error);
    }
  }

  // ALL: RETURN PAIRED DEVICES
  getShellyCollection() {
    return this.shellyDevices;
  }

  async onUninit() {
    try {
      this.homey.clearInterval(this.wsPingInterval);
      this.homey.clearInterval(this.bleInterval);
      this.homey.clearTimeout(this.wsPingTimeout);
      this.homey.clearTimeout(this.wsReconnectTimeout);
      this.homey.clearTimeout(this.wssReconnectTimeout);
      shellies.stop();
      if (this.ws.readyState !== WebSocket.CLOSED) {
        this.ws.close();
      }
      if (this.wss.readyState !== WebSocket.CLOSED) {
        this.wss.close();
      }
    } catch (error) {
      this.error(error);
    }
  }

}

module.exports = ShellyApp;