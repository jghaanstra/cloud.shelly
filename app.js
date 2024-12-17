'use strict';

const Homey = require('homey');
const {Log} = require('@drenso/homey-log');
const { OAuth2App } = require('homey-oauth2app');
const ShellyOAuth2Client = require('./lib/ShellyOAuth2Client');
const Util = require('./lib/util.js');
const shellies = require('shellies');
const WebSocket = require('ws');
const tinycolor = require("tinycolor2");
const { jwtDecode } = require('jwt-decode');

class ShellyApp extends OAuth2App {
  homeyLog = new Log({homey: this.homey});

  static OAUTH2_CLIENT = ShellyOAuth2Client;
  static OAUTH2_DEBUG = Homey.env.DEBUG === '1';
  static OAUTH2_MULTI_SESSION = false;
  static OAUTH2_DRIVERS = ['shelly_cloud'];

  async onOAuth2Init() {
    try {
      this.log('Initializing Shelly App ...');

      if (!this.util) this.util = new Util({homey: this.homey});

      // VARIABLES GENERIC
      this.shellyDevices = [];

      // VARIABLES WEBSOCKET GEN2
      this.wss = null;

      // VARIABLES CLOUD GEN1 & GEN2
      this.client = null;
      this.cloudServer = null;
      this.cloudAccessToken = null;
      this.cloudWs = null;
      this.cloudWsUnInit = false;
      this.wsConnected = false;

      // ALL: INITIALLY UPDATE THE SHELLY COLLECTION FOR MATCHING INCOMING STATUS UPDATES
      this.homey.setTimeout(async () => {
        try {
          await this.updateShellyCollection();
          this.log('Shelly collection has been updated ...');
        } catch (error) {
          this.error(error);
        }
      }, Number(Homey.env.TIMEOUT_COLLECTION));

      // COAP GEN1: START COAP LISTENER FOR RECEIVING STATUS UPDATES
      if (this.homey.platform !== "cloud") {
        this.homey.setTimeout(async () => {
          try {
            let gen1 = await this.util.getDeviceType('gen1');
            if (gen1) {
              shellies.start();
              this.log('CoAP listener for gen1 LAN devices started ...');
            } else {
              this.log('CoAP listener not started as no gen 1 devices where found during app init ...');
            }
          } catch (error) {
            this.error(error);
          }
        }, Number(Homey.env.TIMEOUT_COAP));
      }

      // WEBSOCKET GEN2: INITIALLY START WEBSOCKET SERVER AND LISTEN FOR GEN2 UPDATES
      if (this.homey.platform !== "cloud") {
        this.homey.setTimeout(async () => {
          let gen2 = await this.util.getDeviceType('gen2');
          let gen3 = await this.util.getDeviceType('gen3');
          if (gen2 || gen3) {
            this.websocketLocalListener();
          } else {
            this.log('Websocket server for gen2 / gen3 devices with outbound websockets not started as no gen2 / gen3 devices where found during app init ...');
          }
        }, Number(Homey.env.TIMEOUT_WEBSOCKET));
      }

      // BLUETOOTH GEN2: LISTEN FOR BLE ADVERTISEMENTS
      if (this.homey.platform !== "cloud") {
        this.homey.setTimeout(async () => {
          try {
            let bluetooth = await this.util.getDeviceType('bluetooth');
            if (bluetooth) {
              this.bluetoothListener();
            } else {
              this.log('BLE listener not started as no Bluetooth devices have been paired ...');
            }
          } catch (error) {
            this.error(error);
          }
        }, Number(Homey.env.TIMEOUT_BLUETOOTH));
      }

      // CLOUD: START CLOUD LISTENER AND INITIALLY UPDATE DEVICE STATUS AND REFRESH TOKEN IF NEEDED
      if (this.homey.platform === "cloud") {
        try {
          /* open the cloud websocket */
          this.homey.setTimeout(async () => {
            this.websocketCloudListener();
          }, 10000);

          /* initially update the device status based on Shelly Cloud status (also used to refresh expired tokens) */
          this.homey.setTimeout(async () => {
            if (this.cloudServer !== null) {
              await this.cloudDeviceStatus().catch(this.error);
            }
          }, 18000);

           /* update at 31 minute interval the device status based on Shelly Cloud status (also used to refresh expired tokens) */
          this.homey.clearInterval(this.cloudDeviceStatusInterval);
          this.cloudDeviceStatusInterval = this.homey.setInterval(async () => {
            await this.cloudDeviceStatus().catch(this.error);
          }, 1860000);

        } catch (error) {
          this.error(error);
        }
      }

      // GENERIC TRIGGER FLOWCARDS
      this.homey.flow.getTriggerCard('triggerDeviceOffline');
      this.homey.flow.getTriggerCard('triggerFWUpdate');
      this.homey.flow.getTriggerCard('triggerCloudError');

      // TODO: remove this eventually as this card is deprecated but probably still in use
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
        try {
          return await this.util.getShellies('flowcard_actions');
        } catch (error) {
          this.error(error)
        }
      });
      listenerCallbacks.getArgument('action').registerAutocompleteListener(async (query, args) => {
        try {
          return await this.util.getActions(args.shelly.actions);
        } catch (error) {
          this.error(error)
        }
      });

      // GENERIC SHELLY ACTION FLOWCARDS
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
            this.error(error);
            return Promise.reject(error);
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
            this.error(error);
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
            this.error(error);
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
                      await this.util.sendRPCCommand('/rpc/Shelly.CheckForUpdate', device.getSetting('address'), device.getSetting('password'));
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
            this.error(error);
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
            this.error(error);
            return Promise.reject(error);
          }
        })

      // GENERIC DEVICE TRIGGER CARDS

      /* action events */
      const listenerActionEvents = this.homey.flow.getDeviceTriggerCard('triggerActionEvent').registerRunListener(async (args, state) => {
        try {
          var action = args.action.action ?? args.action.name;
          if ((state.action === action) || (args.action.id === 999)) {
            return Promise.resolve(true);
          } else {
            return Promise.resolve(false);
          }
        } catch (error) {
          this.error(error)
        }
      });
      listenerActionEvents.getArgument('action').registerAutocompleteListener(async (query, args) => {
        try {
          return await this.util.getActions(args.device.getStoreValue('config').callbacks);
        } catch (error) {
          this.error(error)
        }
      });


      /* virtual components */
      const listenerTriggerVirtualComponents = this.homey.flow.getDeviceTriggerCard('triggerVirtualComponents').registerRunListener(async (args, state) => {
        try {
          if (args.virtual_component.id === state.vc_id) {
            return Promise.resolve(true);
          } else {
            return Promise.resolve(false);
          }
        } catch (error) {
          this.error(error)
        }
      });
      listenerTriggerVirtualComponents.getArgument('virtual_component').registerAutocompleteListener(async (query, args) => {
        try {
          return await this.util.getVirtualComponents(args.device.getSetting('address'), args.device.getSetting('password'), 'all');
        } catch (error) {
          this.error(error)
        }
      });

      // GENERIC DEVICE CONDITION FLOWCARDS
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

      // GENERIC DEVICE ACTION CARDS

      /* virtual components */
      const listenerActionVirtualComponentsBoolean = this.homey.flow.getActionCard('actionUpdateVirtualComponentBoolean').registerRunListener(async (args, state) => {
        try {
          return await this.util.sendRPCCommand('/rpc/Boolean.Set?id='+args.virtual_component.vc_id+'&value='+args.boolean, args.device.getSetting('address'), args.device.getSetting('password'));
        } catch (error) {
          this.error(error)
        }
      });
      listenerActionVirtualComponentsBoolean.getArgument('virtual_component').registerAutocompleteListener(async (query, args) => {
        try {
          return await this.util.getVirtualComponents(args.device.getSetting('address'), args.device.getSetting('password'), 'boolean');
        } catch (error) {
          this.error(error)
        }
      });

      const listenerActionVirtualComponentsNumber = this.homey.flow.getActionCard('actionUpdateVirtualComponentNumber').registerRunListener(async (args, state) => {
        try {
          return await this.util.sendRPCCommand('/rpc/Number.Set?id='+args.virtual_component.vc_id+'&value='+args.number, args.device.getSetting('address'), args.device.getSetting('password'));
        } catch (error) {
          this.error(error)
        }
      });
      listenerActionVirtualComponentsNumber.getArgument('virtual_component').registerAutocompleteListener(async (query, args) => {
        try {
          return await this.util.getVirtualComponents(args.device.getSetting('address'), args.device.getSetting('password'), 'number');
        } catch (error) {
          this.error(error)
        }
      });

      const listenerActionVirtualComponentsText = this.homey.flow.getActionCard('actionUpdateVirtualComponentText').registerRunListener(async (args, state) => {
        try {
          return await this.util.sendRPCCommand('/rpc/Text.Set?id='+args.virtual_component.vc_id+'&value="'+args.text+'"', args.device.getSetting('address'), args.device.getSetting('password'));
        } catch (error) {
          this.error(error)
        }
      });
      listenerActionVirtualComponentsText.getArgument('virtual_component').registerAutocompleteListener(async (query, args) => {
        try {
          return await this.util.getVirtualComponents(args.device.getSetting('address'), args.device.getSetting('password'), 'text');
        } catch (error) {
          this.error(error)
        }
      });

      const listenerActionVirtualComponentsEnum = this.homey.flow.getActionCard('actionUpdateVirtualComponentEnum').registerRunListener(async (args, state) => {
        try {
          return await this.util.sendRPCCommand('/rpc/Enum.Set?id='+args.virtual_component.vc_id+'&value="'+args.enum.id+'"', args.device.getSetting('address'), args.device.getSetting('password'));
        } catch (error) {
          this.error(error)
        }
      });
      listenerActionVirtualComponentsEnum.getArgument('virtual_component').registerAutocompleteListener(async (query, args) => {
        try {
          return await this.util.getVirtualComponents(args.device.getSetting('address'), args.device.getSetting('password'), 'enum');
        } catch (error) {
          this.error(error)
        }
      });
      listenerActionVirtualComponentsEnum.getArgument('enum').registerAutocompleteListener(async (query, args) => {
        try {
          let enum_options = [];
          args.virtual_component.enum_options.forEach((option) => {
            enum_options.push({
              id: option,
              name: option,
              icon: '/assets/enum.svg'
            });
          });
          return enum_options;
        } catch (error) {
          this.error(error)
        }
      });

      /* relays */
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
                return await this.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest-timer', command: 'relay', command_param: 'turn', command_value: onoff, timer_param: 'timeout', timer: args.timer, deviceid: String(args.device.getSetting('cloud_device_id')), channel: args.device.getStoreValue('channel')})]);
              }
            }
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      /* Plus Plug S */
      this.homey.flow.getActionCard('actionPlusPlugSLEDRing')
        .registerRunListener(async (args) => {
          try {
            const config = await this.util.sendRPCCommand('/rpc/PLUGS_UI.GetConfig', args.device.getSetting('address'), args.device.getSetting('password'));
            const onColor = tinycolor(args.on_color);
            const onColorRGB = onColor.toPercentageRgb();
            const offColor = tinycolor(args.off_color);
            const offColorRGB = offColor.toPercentageRgb();

            config.leds.mode = "switch";
            config.leds.colors['switch:0'].on.rgb = [parseInt(onColorRGB.r, 10), parseInt(onColorRGB.g, 10), parseInt(onColorRGB.b, 10)];
            config.leds.colors['switch:0'].on.brightness = args.on_brightness;
            config.leds.colors['switch:0'].off.rgb = [parseInt(offColorRGB.r, 10), parseInt(offColorRGB.g, 10), parseInt(offColorRGB.b, 10)];
            config.leds.colors['switch:0'].off.brightness = args.off_brightness;

            return await this.util.sendRPCCommand('/rpc', args.device.getSetting('address'), args.device.getSetting('password'), 'POST', {"id": 1, "method": "PLUGS_UI.SetConfig", "params": {"config": config } });
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      /* lights */
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
                return await this.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest-timer', command: 'light', command_param: 'turn', command_value: onoff, timer_param: 'transition', timer: args.transition, deviceid: String(args.device.getSetting('cloud_device_id')), channel: args.device.getStoreValue('channel')})]);
              }
            }
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      this.homey.flow.getActionCard('effectRGBW2Color') /* deprecated and replaced by more generic actionColorEffect */
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendCommand('/color/0?turn=on&effect='+ Number(args.effect) +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      this.homey.flow.getActionCard('actionColorEffect')
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendCommand('/color/0?turn=on&effect='+ args.effect +'&duration='+ args.duration, args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      this.homey.flow.getActionCard('actionRGBW2EnableWhiteMode')
        .registerRunListener(async (args) => {
          try {
            return await args.device.triggerCapabilityListener("onoff.whitemode", true);
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      this.homey.flow.getActionCard('actionRGBW2DisableWhiteMode')
        .registerRunListener(async (args) => {
          try {
            return await args.device.triggerCapabilityListener("onoff.whitemode", false);
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      this.homey.flow.getActionCard('actionRGBW2DimWhite')
        .registerRunListener(async (args) => {
          try {
            return await args.device.triggerCapabilityListener("dim.white", args.brightness);
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      /* roller shutters */
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
                return await this.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest-timer', command: 'roller', command_param: 'go', command_value: cloud_direction, timer_param: 'duration', timer: args.move_duration, deviceid: String(args.device.getSetting('cloud_device_id')), channel: args.device.getStoreValue('channel')})]);
              }
            }
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
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
            this.error(error);
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
            this.error(error);
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
            this.error(error);
            return Promise.reject(error);
          }
        })

      /* CUSTOM ACTION CARD FOR windowcoverings_tilt_set AS ATHOM DID NOT IMPLEMENT IT */
      this.homey.flow.getActionCard('actionShutterTiltSet')
      .registerRunListener(async (args) => {
        try {
          if (args.device.hasCapability('windowcoverings_tilt_set')) {
            return await args.device.triggerCapabilityListener('windowcoverings_tilt_set', tilt).catch(this.error);
          }
        } catch (error) {
          this.error(error);
          return Promise.reject(error.message);
        }
      })

      /* gas */
      this.homey.flow.getActionCard('actionGasSetVolume')
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendCommand('/settings/?set_volume='+ args.volume +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      this.homey.flow.getActionCard('actionGasMute')
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendCommand('/mute', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      this.homey.flow.getActionCard('actionGasUnmute')
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendCommand('/unmute', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      this.homey.flow.getActionCard('actionGasTest')
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendCommand('/self_test', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      /* smoke */
      this.homey.flow.getActionCard('actionSmokeMute')
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendRPCCommand('/rpc/Smoke.Mute?id='+ args.device.getStoreValue('channel'), args.device.getSetting('address'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      /* TRV */
      this.homey.flow.getConditionCard('conditionValveMode')
        .registerRunListener(async (args) => {
          try {
            if (args.profile.id === args.device.getCapabilityValue("valve_mode")) {
              return true;
            } else {
              return false;
            }
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
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
            switch(args.device.getStoreValue('communication')) {
              case 'coap': {
                return await this.util.sendCommand('/thermostat/0?pos='+ args.position +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
              }
              case 'websocket': {
                break;
              }
              case 'gateway': {
                return await this.util.sendRPCCommand('/rpc/'+ args.device.getStoreValue('config').extra.component +'.Call?id='+ args.device.getStoreValue('componentid') +'&method=TRV.SetPosition&params={"id":0,"pos":'+ args.position +'}', args.device.getSetting('address'), args.device.getSetting('password'));
              }
            }
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
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
            this.error(error);
            return Promise.reject(error);
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
            switch(args.device.getStoreValue('communication')) {
              case 'coap': {
                return await this.util.sendCommand('/ext_t?temp='+ args.temperature +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
              }
              case 'websocket': {
                break;
              }
              case 'gateway': {
                return await this.util.sendRPCCommand('/rpc/'+ args.device.getStoreValue('config').extra.component +'.Call?id='+ args.device.getStoreValue('componentid') +'&method=TRV.SetExternalTemperature&params={"id":0,"t_C":'+ args.temperature +'}', args.device.getSetting('address'), args.device.getSetting('password'));
              }
            }
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      this.homey.flow.getActionCard('actionTrvOverride')
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendRPCCommand('/rpc/'+ args.device.getStoreValue('config').extra.component +'.Call?id='+ args.device.getStoreValue('componentid') +'&method=TRV.SetOverride&params={"id":0,"target_C":'+ args.target_c +', "duration":'+ args.duration +'}', args.device.getSetting('address'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      this.homey.flow.getActionCard('actionTrvBoost')
        .registerRunListener(async (args) => {
          try {
            switch(args.device.getStoreValue('communication')) {
              case 'coap': {
                return await this.util.sendCommand('/thermostat/0?boost_minutes='+ args.duration +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
              }
              case 'websocket': {
                break;
              }
              case 'gateway': {
                return await this.util.sendRPCCommand('/rpc/'+ args.device.getStoreValue('config').extra.component +'.Call?id='+ args.device.getStoreValue('componentid') +'&method=TRV.SetBoost&params={"id":0,"duration":'+ args.duration +'}', args.device.getSetting('address'), args.device.getSetting('password'));
              }
            }
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      this.homey.flow.getActionCard('actionTrvClearBoost')
        .registerRunListener(async (args) => {
          try {
            return await this.util.sendRPCCommand('/rpc/'+ args.device.getStoreValue('config').extra.component +'.Call?id='+ args.device.getStoreValue('componentid') +'&method=TRV.ClearBoost&params={"id":0}', args.device.getSetting('address'), args.device.getSetting('password'));
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })

      /* EM DEVICES */
      this.homey.flow.getActionCard('actionSetCumulative')
      .registerRunListener(async (args) => {
        try {
          return await args.device.setEnergy({ cumulative: args.cumulative });
        } catch (error) {
          this.error(error);
          return Promise.reject(error);
        }
      })

      this.homey.flow.getActionCard('actionResetTotals')
      .registerRunListener(async (args) => {
        try {
          switch(args.device.getStoreValue('communication')) {
            case 'coap': {
              if (args.device.hasCapability('meter_power_returned')) {
                return await this.util.sendCommand('/emeter/'+ args.device.getStoreValue('channel') +'?reset_totals=true', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
              } else {
                return Promise.reject('This device does not support resetting the energy meter counter.');
              }
            }
            case 'websocket': {
              const result = await this.util.sendRPCCommand('/rpc/Shelly.GetStatus', args.device.getSetting('address'), args.device.getSetting('password'));
              if (result.hasOwnProperty("em:0")) {
                await this.util.sendRPCCommand('/rpc/EMData.ResetCounters?id='+ args.device.getStoreValue('channel'), args.device.getSetting('address'), args.device.getSetting('password'));
              }
              if (result.hasOwnProperty("em1:0")) {
                await this.util.sendRPCCommand('/rpc/EM1Data.ResetCounters?id='+ args.device.getStoreValue('channel'), args.device.getSetting('address'), args.device.getSetting('password'));
              }
              if (result.hasOwnProperty("pm1:0")) {
                await this.util.sendRPCCommand('/rpc/PM1.ResetCounters?id='+ args.device.getStoreValue('channel'), args.device.getSetting('address'), args.device.getSetting('password'));
              }
              if (result.hasOwnProperty("switch:"+ args.device.getStoreValue('channel'))) {
                await this.util.sendRPCCommand('/rpc/Switch.ResetCounters?id='+ args.device.getStoreValue('channel'), args.device.getSetting('address'), args.device.getSetting('password'));
              }
              return;
            }
          }
        } catch (error) {
          this.error(error);
          return Promise.reject(error);
        }
      })

      this.homey.flow.getActionCard('actionSetDeviceClass')
        .registerRunListener(async (args) => {
          try {
            args.device.setStoreValue('customclass', true);
            return await args.device.setClass(args.class.name);
          } catch (error) {
            this.error(error);
            return Promise.reject(error);
          }
        })
        .getArgument('class')
          .registerAutocompleteListener(async (query, args) => {
            try {
              const results =  await this.util.getDeviceClasses();
              return results.filter((result) => {
                return result.name.toLowerCase().includes(query.toLowerCase());
              });
            } catch (error) {
              this.error(error)
            }
          })

      /* WAVE (PRO) SHUTTER */

      /* CUSTOM ACTION CARD FOR windowcoverings_tilt_set AS ATHOM DID NOT IMPLEMENT IT */
      this.homey.flow.getActionCard('actionWaveShutterTiltSet')
      .registerRunListener(async (args) => {
        try {
          if (args.device.hasCapability('windowcoverings_tilt_set')) {
            args.device.setCapabilityValue('windowcoverings_tilt_set', args.tilt).catch(this.error);
            return args.device._setCapabilityValue('windowcoverings_tilt_set', 'SWITCH_MULTILEVEL', args.tilt);
          }
        } catch (error) {
          this.error(error);
          return Promise.reject(error.message);
        }
      })


      // COAP GEN1: COAP LISTENER FOR PROCESSING INCOMING MESSAGES
      const coapChangeHandler = (device, prop, newValue, oldValue) => {
        try {
            this.debug(prop, 'changed from', oldValue, 'to', newValue, 'for device', device.id, 'with IP address', device.host);

            switch (prop) {
              case 'battery':
              case 'tilt':
              case 'vibration':
              case 'smoke':
              case 'flood':
              case 'motion':
                // -1 indicates that there is no valid sensor reading, convert that to null
                if (newValue === -1) {
                  this.debug('Invalid reading, changing value to null', prop);
                  newValue = null;
                }
                break;
              case 'temperature':
                // 999 indicates an invalid reading
                if (newValue === 999) {
                  this.debug('Invalid reading, changing value to null', prop);
                  newValue = null;
                }
                break;
              default:
                break;
            }

            if (this.shellyDevices.length === 0) {
                this.debug('No devices added to Homey');
                return;
            }

            // Filter total device collection based on incoming device id
            const filteredShelliesCoap = this.shellyDevices.filter(shelly => shelly.id.includes(device.id));
            if (filteredShelliesCoap.length === 0) {
                this.debug("Matching device not found");
                return;
            }

            let coap_device;
            if (filteredShelliesCoap.length === 1) {
                coap_device = filteredShelliesCoap[0].device; // when there is 1 filtered device it's not multichannel
            } else {
                const channel = prop.slice(prop.length - 1);

                let coap_device_id;
                if (isNaN(channel)) {
                    // When the capability does not have a ending channel number it's targeted at channel 0
                    coap_device_id = filteredShelliesCoap[0].main_device + '-channel-0';
                } else {
                    // When the capability does have an ending channel number set it to the correct channel
                    coap_device_id = filteredShelliesCoap[0].main_device + '-channel-' + channel;
                }

                // Filter the filtered shellies with the correct channel device id
                const filteredShellyCoap = filteredShelliesCoap.filter(shelly => shelly.id.includes(coap_device_id));
                coap_device = filteredShellyCoap[0].device;
            }

            coap_device.parseCapabilityUpdate(prop, newValue, coap_device.getStoreValue('channel'));
            if (coap_device.getSetting('address') !== device.host) {
                coap_device.setSettings({address: device.host}).catch(this.error);
            }
        } catch (error) {
          this.error('Error processing CoAP message for device', device.id, 'of type', device.type, 'with IP address', device.host, 'on capability', prop, 'with old value', oldValue, 'to new value', newValue);
          this.error(error);
        }
      };

      shellies.on('discover', device => {
        this.log('Discovered device with ID', device.id, 'and type', device.type, 'with IP address', device.host);

        // Retrieve initial values from discovery message
        [...device].forEach(item => coapChangeHandler(device, item[0], item[1], null));

        // Register change handler
        device.on('change', (prop, newValue, oldValue) => coapChangeHandler(device, prop, newValue, oldValue));
      });

    } catch (error) {
      this.log(error);
    }
  }

  // WEBSOCKET GEN2: START WEBSOCKET SERVER AND LISTEN FOR INBOUND GEN2 AND BLUETOOTH UPDATES
  async websocketLocalListener() {
    try {
      if (this.wss === null) {
        this.wss = new WebSocket.Server({ port: 6113 });
        this.log('Websocket server for gen2 / gen3 devices with outbound websockets started ...');
        this.wss.on("connection", async (wsserver, req) => {

          wsserver.send('{"jsonrpc":"2.0", "id":1, "src":"wsserver-getdeviceinfo_onconnect", "method":"Shelly.GetDeviceInfo"}');
          await this.util.sleep(1000);
          wsserver.send('{"jsonrpc":"2.0", "id":1, "src":"wsserver-getfullstatus_onconnect", "method":"Shelly.GetStatus"}');

          wsserver.on("message", async (data) => {
            const result = JSON.parse(data);
            if (result.hasOwnProperty('method') && result.hasOwnProperty("params")) {
              if (result.method === 'NotifyFullStatus') { // parse full status updates
                const filteredShelliesWss = this.shellyDevices.filter(shelly => shelly.id.toLowerCase().includes(result.src.toLowerCase())).filter(shelly => shelly.channel === 0);
                for (const filteredShellyWss of filteredShelliesWss) {
                  filteredShellyWss.device.parseFullStatusUpdateGen2(result.params);
                  if (result.params.hasOwnProperty('wifi')) {
                    if (result.params.wifi.sta_ip !== null) { // update IP address if it does not match the device
                      if (filteredShellyWss.device.getSetting('address') !== String(result.params.wifi.sta_ip)) {
                        await filteredShellyWss.device.setSettings({address: String(result.params.wifi.sta_ip)}).catch(this.error);
                      }
                    }
                  }
                }
              } else if (result.method === 'NotifyStatus') { // parse single component updates
                let filteredShelliesWss = this.shellyDevices.filter(shelly => shelly.id.toLowerCase().includes(result.src.toLowerCase())).filter(shelly => shelly.channel === 0);

                if (result.src.includes('shellyblugwg3-')) { // get the right device from status reports of the BLU Gateway Gen3
                  // TODO: current BLU TRV firmware only reports battery and rssi under the TRV component. Sensors are reported under different components and there is no (easy) way to match them. Allterco Robotics needs to fix this in their firmware.
                  let componenttype = '';
                  let componentid = '';
                  const paramsKeys = Object.keys(result.params);
                  paramsKeys.forEach(key => {
                    if (key.includes(':')) {
                      componenttype = key.split(':')[0];
                      componentid = key.split(':')[1];
                    }
                  });
                  filteredShelliesWss = filteredShelliesWss.filter(shelly => shelly.id.toLowerCase().includes(componenttype)).filter(shelly => shelly.id.toLowerCase().includes(componentid.toString()));
                }

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
                    const filteredShelliesWss = this.shellyDevices.filter(shelly => shelly.id.toLowerCase().includes(result.src.toLowerCase())).filter(shelly => shelly.channel === 0);
                    for (const filteredShellyWss of filteredShelliesWss) {
                      filteredShellyWss.device.parseSingleStatusUpdateGen2(result);
                    }
                  }
                }
              }
            } else if (result.dst === 'wsserver-getdeviceinfo_onconnect') { // parse device info request after each (re)connect
              const filteredShelliesWss = this.shellyDevices.filter(shelly => shelly.id.toLowerCase().includes(result.src.toLowerCase()));
              for (const filteredShellyWss of filteredShelliesWss) {
                if (result.hasOwnProperty("result")) {
                  filteredShellyWss.device.setStoreValue('type', result.result.model);
                  filteredShellyWss.device.setStoreValue('fw_version', result.result.ver);
                }
              }
            } else if (result.dst === 'wsserver-getfullstatus_onconnect') { // parse full initial status updates after each (re)connect
              const filteredShelliesWss = this.shellyDevices.filter(shelly => shelly.id.toLowerCase().includes(result.src.toLowerCase())).filter(shelly => shelly.channel === 0);
              for (const filteredShellyWss of filteredShelliesWss) {
                filteredShellyWss.device.parseFullStatusUpdateGen2(result.result);
                if (result.result !== undefined) {
                  if (result.result.hasOwnProperty('wifi')) {
                    if (result.result.wifi.sta_ip !== null) { // update IP address if it does not match the device
                      if (filteredShellyWss.device.getSetting('address') !== String(result.result.wifi.sta_ip)) {
                        await filteredShellyWss.device.setSettings({address: String(result.result.wifi.sta_ip)}).catch(this.error);
                      }
                    }
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
            try {
              this.websocketLocalListener();
            } catch (error) {
              this.error(error);
            }
          }, 500);
        });
      }
    } catch (error) {
      clearTimeout(this.wssReconnectTimeout);
      this.wssReconnectTimeout = this.homey.setTimeout(async () => {
        try {
          this.websocketLocalListener();
        } catch (error) {
          this.error(error);
        }
      }, 5000);
    }
  }

  // CLOUD: OPEN CLOUD WEBSOCKET FOR PROCESSING CLOUD DEVICES STATUS UPDATES
  async websocketCloudListener() {
    try {
      if (this.cloudWsUnInit === false && (this.cloudWs == null || this.cloudWs.readyState === WebSocket.CLOSED)) {

        this.client = this.getFirstSavedOAuth2Client();
        const oauth_token = this.client.getToken();
        this.cloudAccessToken = oauth_token.access_token;
        const cloud_details = await jwtDecode(oauth_token.access_token);
        this.cloudServer = cloud_details.user_api_url.replace('https://', '');

        this.cloudWs = new WebSocket('wss://'+ this.cloudServer +':6113/shelly/wss/hk_sock?t='+ this.cloudAccessToken, {perMessageDeflate: false});

        this.cloudWs.on('open', () => {
          this.log('Cloud websocket for cloud devices opened (again) ...');

          this.wsConnected = true;

          // start sending pings every 2 minutes to check the connection status
          this.homey.clearInterval(this.wsPingInterval);
          this.wsPingInterval = this.homey.setInterval(() => {
            if (this.wsConnected === true && this.cloudWs.readyState === WebSocket.OPEN) {
              this.cloudWs.ping();
            }
          }, 120 * 1000);
        });

        this.cloudWs.on('message', async (data) => {
          try {
            if (this.cloudWsUnInit === false) {
              const result = JSON.parse(data);
              if (result.event === 'Shelly:StatusOnChange' || result.event === 'Shelly:Online') {
                if (result.device.gen !== 'GBLE') {
                  var ws_device_id = Number(result.device.id).toString(16);
                } else {
                  var ws_device_id = result.device.id;
                }

                const filteredShelliesWs = this.shellyDevices.filter(shelly => shelly.id.includes(ws_device_id));
                for (const filteredShellyWs of filteredShelliesWs) {

                  // parse status updates of Shelly:StatusOnChange
                  if (result.hasOwnProperty("status")) {
                    if (result.device.gen === 'G1') {
                      filteredShellyWs.device.parseFullStatusUpdateGen1(result.status);
                    } else if (result.device.gen === 'G2' || result.device.gen === 'GBLE') {
                      filteredShellyWs.device.parseFullStatusUpdateGen2(result.status);
                    }
                  }

                  // parse online message from Shelly:Online
                  if (result.event === 'Shelly:Online') {
                    if (result.online === 0) {
                      filteredShellyWs.device.setUnavailable(this.homey.__('device.unreachable_on_cloud')).catch(error => { this.error(error) });
                      this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": filteredShellyWs.device.getName(), "device_error": this.homey.__('device.unreachable_on_cloud')}).catch(error => { this.error(error) });
                    } else if (result.online === 1) {
                      filteredShellyWs.device.setAvailable().catch(error => { this.error(error) });
                    }
                  }

                  await this.util.sleep(250);
                }
              }
            }
          } catch (error) {
            this.error(error);
          }
        });

        this.cloudWs.on('pong', () => {

          // restart closed connection or terminate connection if pong response is not received after three consecutive pings
          this.homey.clearTimeout(this.wsPingTimeout);
          this.wsPingTimeout = this.homey.setTimeout(async () => {
            try {
              if (this.cloudWsUnInit === false && (this.cloudWs === null || this.cloudWs.readyState === WebSocket.CLOSED)) {
                this.wsConnected = false;
                this.websocketCloudListener();
              } else if (this.wsConnected) {
                this.error('Cloud websocket connection has not responded to the last 3 ping-pongs and is being terminated.');
                this.cloudWs.terminate();
              }
            } catch (error) {
              this.error(error);
            }
          }, 370 * 1000);
        });

        this.cloudWs.on('error', async (error) => {
          if (this.cloudWsUnInit === false) {
            this.error('Cloud websocket error:', error.message);
            this.error(error);
            await this.homey.flow.getTriggerCard('triggerCloudError').trigger({"error": error.message}).catch(error => { this.error(error) });
          }
        });

        this.cloudWs.on('close', async (code, reason) => {
          try {
            if (this.cloudWsUnInit === false) {
              if (code === undefined || code === null ) {
                this.error('Cloud websocket terminated without error code.');
                await this.homey.flow.getTriggerCard('triggerCloudError').trigger({"error": 'Cloud websocket connection has not responded to the last 3 ping-pongs and is being closed.'}).catch(error => { this.error(error) });
              } else {
                this.error('Cloud websocket closed due to reasoncode:', code);
                await this.homey.flow.getTriggerCard('triggerCloudError').trigger({"error": 'Cloud websocket closed due to reasoncode: '+ code +''}).catch(error => { this.error(error) });
              }

              this.homey.clearInterval(this.wsPingInterval);
              this.homey.clearTimeout(this.wsReconnectTimeout);
              this.wsConnected = false;

              /* refresh device status as this also triggers a refresh of the token if expired, needed to reconnect the websocket */
              await this.cloudDeviceStatus().catch(this.error);

              // retry connection after 30 seconds
              this.wsReconnectTimeout = this.homey.setTimeout(async () => {
                try {
                  this.error('Retrying to establish connection after 30 seconds.');
                  this.websocketCloudListener();
                } catch (error) {
                  this.error(error);
                }
              }, 30000);
            }
          } catch (error) {
            this.error(error);
          }
        });

      }
    } catch (error) {
      this.error(error);
      this.homey.flow.getTriggerCard('triggerCloudError').trigger({"error": error.message}).catch(error => { this.error(error) });
    }
  }

  // CLOUD: CHECK DEVICE STATUS AND REFRESH TOKEN IN THE PROCESS IF NEEDED
  async cloudDeviceStatus() {
    try {
      if (this.client !== null) {
        const cloudDevices = await this.client.getCloudDevices(this.cloudServer);
        Object.entries(cloudDevices.data.devices_status).forEach(async ([key, value]) => {
          const filteredCloudDevices = this.shellyDevices.filter(shelly => shelly.id.includes(key));
          for (const filteredCloudDevice of filteredCloudDevices) {
            if (value._dev_info.online === false) {
              filteredCloudDevice.device.setUnavailable(this.homey.__('device.unreachable_on_cloud')).catch(error => { this.error(error) });
              this.error('Marking device', filteredCloudDevice.device.getName(), 'with id', filteredCloudDevice.device.getData().id, 'as unreachable as it is marked as offline in Shelly Cloud.');
            }
          }
        });
      }
      return Promise.resolve(true);
    } catch(error) {
      this.error(error);
      return Promise.reject(error);
    }
  }

  // BLUETOOTH: CONTINUOSLY LISTEN FOR BLE ADVERTISEMENTS
  async bluetoothListener() {
    try {
      this.log('Bluetooth listener (re)started ...');
      this.homey.clearInterval(this.bleInterval);
      this.bleInterval = this.homey.setInterval(async () => {
        const advertisements = await this.homey.ble.discover().catch(this.error);
        if (Array.isArray(advertisements)) {
          advertisements.forEach(advertisement => {
            if (this.util.filterBLEDevices(advertisement.localName)) {
              const filteredShelliesWss = this.shellyDevices.filter(shelly => shelly.id.includes(advertisement.address)).filter(shelly => shelly.channel === 0);
              for (const filteredShellyWss of filteredShelliesWss) {
                filteredShellyWss.device.parseBluetoothAdvertisement(advertisement);
              }
            }
          });
        }
      }, 5100);
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
        try {
          shellies.start();
        } catch (error) {
          this.error(error);
        }
      }, 1000);
      return Promise.resolve(true);
    } catch (error) {
      this.error(error)
    }
  }

  // CLOUD GEN1 & GEN2: SEND COMMANDS OVER CLOUD WEBSOCKET
  async websocketSendCommand(commands) {
    try {
      for (let command of commands) {
    		this.cloudWs.send(command);
    		await this.util.sleep(500);
    	}
      return Promise.resolve(true);
    } catch (error) {
      this.error('Websocket error sending command');
      this.error(error);
    }
  }

  // CLOUD GEN1 & GEN2: CLOSE CLOUD WEBSOCKET IF NOT NEEDED
  async websocketClose() {
    try {
      const filteredShellies = this.shellyDevices.filter(shelly => shelly.communication.includes('cloud'));
      if (filteredShellies.length === 0) {
        if (this.cloudWs !== null && this.cloudWs.readyState !== WebSocket.CLOSED) {
          this.error('Closing websocket because there are no more cloud devices paired');
          this.cloudWs.close();
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
      this.cloudWsUnInit = true;

      this.homey.clearInterval(this.wsPingInterval);
      this.homey.clearInterval(this.cloudDeviceStatusInterval);
      this.homey.clearInterval(this.bleInterval);
      this.homey.clearTimeout(this.wsPingTimeout);
      this.homey.clearTimeout(this.wsReconnectTimeout);
      this.homey.clearTimeout(this.wssReconnectTimeout);
      shellies.stop();
      if (this.cloudWs.readyState !== WebSocket.CLOSED) {
        this.cloudWs.close();
      }
      if (this.wss.readyState !== WebSocket.CLOSED) {
        this.wss.close();
      }
    } catch (error) {
      this.error(error);
    }
  }

  // WIDGET HELPERS

  /* get available firmware updates */
  async getFirmwareUpdates(stage) {
    try {
      let result = [];
      const drivers = Object.values(this.homey.drivers.getDrivers());
      for (const driver of drivers) {
        const devices = driver.getDevices();
        for (const device of devices) {
          if (device.getStoreValue('channel') === 0 && device.getStoreValue('battery') === false && (device.getStoreValue('communication') === 'coap' || device.getStoreValue('communication') === 'websocket')) {
            const firmware = device.getStoreValue('firmware');
            if (!firmware) {
              continue;
            }

            if ((stage === 'both' && (firmware.new || firmware.beta)) || (stage === 'stable' && firmware.new) || (stage === 'beta' && firmware.beta)) {
              result.push({
                id: device.getData().id,
                name: device.getName(),
                stage: firmware.beta ? 'beta' : 'stable',
                currentversion: firmware.currentVersion,
                newversion: firmware.beta ? firmware.betaVersion : firmware.newVersion,
              });
            }
          }
        }
      }
      return Promise.resolve(result);
    } catch (error) {
      this.error(error);
      return Promise.reject(error);
    }
  }

  async updateFirmware(id) {
    try {
      const device = this.shellyDevices.filter(shelly => shelly.id.toLowerCase().includes(id.toLowerCase())).filter(shelly => shelly.channel === 0);
      switch(device[0].device.getStoreValue('communication')) {
        case 'coap': {
          return await this.util.sendCommand('/ota?update=true', device[0].device.getSetting('address'), device[0].device.getSetting('username'), device[0].device.getSetting('password'));
        }
        case 'websocket': {
          return await this.util.sendRPCCommand('/rpc/Shelly.Update', device[0].device.getSetting('address'), device[0].device.getSetting('password'));
        }
      }
    } catch (error) {
      this.error(error);
      return Promise.reject(error);
    }
  }

  debug(...args) {
    if (Homey.env.DEBUG !== '1') {
      return;
    }

    this.log('[dbg]', ...args);
  }
}

module.exports = ShellyApp;
