'use strict';

const Homey = require('homey');
const Util = require('./lib/util.js');
const shellies = require('shellies');
const WebSocket = require('ws');
let shellyDevices = [];
let cloudPairingDevice = {};
let cloudInstall = false;
let cloudServer = null;
let ws = null;
let wsConnected = false;
let wsReconnectTimeout = null;

class ShellyApp extends Homey.App {

  async onInit() {
    this.log('Initializing Shelly App ...');

    if (!this.util) this.util = new Util({homey: this.homey});

    // CLOUD: REGISTER WEBHOOK FOR SHELLY INTEGRATOR PORTAL
    const homeyId = await this.homey.cloud.getHomeyId();
    const webhook_id = Homey.env.WEBHOOK_ID;
    const webhook_secret = Homey.env.WEBHOOK_SECRET;
    const webhook_data = {
      deviceId: homeyId
    }
    const webhook = await this.homey.cloud.createWebhook(webhook_id, webhook_secret, webhook_data);

    // CLOUD: CHECK IF THERE ARE PAIRED CLOUD DEVICES AND OPEN WEBSOCKET
    setTimeout(async () => {
      let result = await this.util.getCloudDetails();
      cloudInstall = result.result;
      cloudServer = result.server_address;

      if (cloudInstall) {
        let jwtToken = await this.util.getJWTToken(Homey.env.SHELLY_TAG, Homey.env.SHELLY_TOKEN);
        this.websocketCloudListener(jwtToken);
      }
    }, 10000);

    // COAP, CLOUD & GEN2 WEBSOCKETS: INITIALLY UPDATE THE SHELLY COLLECTION
    setTimeout(async () => {
      await this.updateShellyCollection();
    }, 30000);

    // COAP: START COAP LISTENER FOR RECEIVING STATUS UPDATES
    if (!this.homey.settings.get('general_coap') && !cloudInstall) {
      setTimeout(async () => {
        shellies.start();
      }, 40000);
    } else {
      this.log('CoAP listener has been disabled from the app settings');
    }

    // COAP, CLOUD & GEN2 WEBSOCKETS: UPDATE THE SHELLY COLLECTION REGULARLY
    setInterval(async () => {
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

    this.homey.flow.getConditionCard('conditionFW')
      .registerRunListener(async (args) => {
        // TODO: deprecated and needs to be removed at some point
        try {
          const result = await this.util.sendCommand('/ota', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          if (result.has_update) {
            return Promise.resolve(true);
          } else {
            return Promise.resolve(false);
          }
        } catch (error) {
          return Promise.reject(error);
        }
      })

    this.homey.flow.getActionCard('actionReboot')
      .registerRunListener(async (args) => {
        if (args.device.getStoreValue('communication') === 'coap') {
          return await this.util.sendCommand('/reboot', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else if (args.device.getStoreValue('communication') === 'websocket') {
          return await args.device.ws.send(JSON.stringify({"id": args.device.getCommandId(), "method": "Shelly.Reboot", "params": {"delay_ms": 0} }));
        } else if (args.device.getStoreValue('communication') === 'cloud') {
          return await this.util.sendCloudCommand('/device/reboot', args.device.getSetting('server_address'), args.device.getSetting('cloud_token'), args.device.getSetting('device_id'));
        }
      })

    this.homey.flow.getActionCard('actionOTAUpdate')
      .registerRunListener(async (args) => {
        return await this.util.sendCommand('/ota?update=true', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    this.homey.flow.getActionCard('flipbackSwitch')
      .registerRunListener(async (args) => {
        var onoff = args.switch === 1 ? 'on' : 'off';
        if (args.device.getStoreValue('communication') === 'coap') {
          return await this.util.sendCommand('/relay/0?turn='+ onoff +'&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else if (args.device.getStoreValue('communication') === 'websocket') {
          return await args.device.ws.send(JSON.stringify({"id": this.getCommandId(), "method": "Switch.Set", "params": {"id": this.getStoreValue('channel'), "on": onoff, "toggle": args.timer} }));
        } else if (args.device.getStoreValue('communication') === 'cloud') {
          return await this.websocketSendCommand([this.util.websocketMessage({event: 'Shelly:CommandRequest', command: 'relay', command_param: 'turn', command_value: onoff, deviceid: args.device.getSetting('device_id'), channel: args.device.getStoreValue('channel')})]);
        }
      })

    this.homey.flow.getActionCard('flipbackSwitch2')
      .registerRunListener(async (args) => {
        // TODO: this is deprecated and needs the be removed eventually
        if (args.switch === '1') {
          return await this.util.sendCommand('/relay/'+ args.relay +'?turn=on&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else {
          return await this.util.sendCommand('/relay/'+ args.relay +'?turn=off&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        }
      })

    this.homey.flow.getActionCard('flipbackSwitch4')
      .registerRunListener(async (args) => {
        // TODO: this is deprecated and needs the be removed eventually
        if (args.switch === '1') {
          return await this.util.sendCommand('/relay/'+ args.relay +'?turn=on&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else {
          return await this.util.sendCommand('/relay/'+ args.relay +'?turn=off&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
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
          if (args.device.getStoreValue('communication') === 'coap') {
            return await this.util.sendCommand('/roller/0?go=stop', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } else if (args.device.getStoreValue('communication') === 'cloud') {
            return await this.util.sendCloudCommand('/device/relay/roller/control/', this.getSetting('server_address'), this.getSetting('cloud_token'), this.getSetting('device_id'), {"direction": "stop"});
          }
        } else if (args.device.getStoreValue('last_action') == 'up') {
          args.device.setStoreValue('last_action', 'down');
          args.device.setCapabilityValue('windowcoverings_state','down');
          if (args.device.getStoreValue('communication') === 'coap') {
            return await this.util.sendCommand('/roller/0?go=close', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } else if (args.device.getStoreValue('communication') === 'cloud') {
            return await this.util.sendCloudCommand('/device/relay/roller/control/', this.getSetting('server_address'), this.getSetting('cloud_token'), this.getSetting('device_id'), {"direction": "close"});
          }
        } else if (args.device.getStoreValue('last_action') == 'down') {
          args.device.setStoreValue('last_action', 'up');
          args.device.setCapabilityValue('windowcoverings_state','up');
          if (args.device.getStoreValue('communication') === 'coap') {
            return await this.util.sendCommand('/roller/0?go=open', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
          } else if (args.device.getStoreValue('communication') === 'cloud') {
            return await this.util.sendCloudCommand('/device/relay/roller/control/', this.getSetting('server_address'), this.getSetting('cloud_token'), this.getSetting('device_id'), {"direction": "open"});
          }
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
            if (args.device.getStoreValue('communication') === 'coap') {
              return await this.util.sendCommand('/roller/0?go=to_pos&roller_pos='+ Math.round(position*100), args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
            } else if (args.device.getStoreValue('communication') === 'cloud') {
              return await this.util.sendCloudCommand('/device/relay/roller/settings/topos/', args.device.getSetting('server_address'), args.device.getSetting('cloud_token'), args.device.getSetting('device_id'), {"pos": Math.round(position*100)});
            }
  	      } else {
            args.device.setCapabilityValue('windowcoverings_set', position);
            if (args.device.getStoreValue('communication') === 'coap') {
              return await this.util.sendCommand('/roller/0?go=to_pos&roller_pos='+ Math.round(position*100), args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
            } else if (args.device.getStoreValue('communication') === 'cloud') {
              return await this.util.sendCloudCommand('/device/relay/roller/settings/topos/', args.device.getSetting('server_address'), args.device.getSetting('cloud_token'), args.device.getSetting('device_id'), {"pos": Math.round(position*100)});
            }
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
          if (shellyDevices.length > 0) {
            const filteredShellies = shellyDevices.filter(shelly => shelly.id.includes(device.id));
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
          if (shellyDevices.length > 0) {
            const offlineShellies = shellyDevices.filter(shelly => shelly.id.includes(device.id));
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
          cloudServer = args.body.host;
          cloudPairingDevice = args.body;
        }

        // start websocket listener, it could be the first device being paired
        if (ws == null) {
          let jwtToken = await this.util.getJWTToken(Homey.env.SHELLY_TAG, Homey.env.SHELLY_TOKEN);
          this.websocketCloudListener(jwtToken);
        }
      } catch (error) {
        this.log(error);
      }
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
        setTimeout(async () => {
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
      shellyDevices = await this.util.getShellies('collection');
      return Promise.resolve(true);
    } catch(error) {
      this.log(error);
      return Promise.reject(error);
    }
  }

  // CLOUD: OPEN WEBSOCKET FOR STATUS CLOUD DEVICES
  async websocketCloudListener(jwtToken) {
    ws = new WebSocket('wss://'+ cloudServer +':6113/shelly/wss/hk_sock?t='+ jwtToken);

    ws.on('open', () => {
    	wsConnected = true;
    });

    ws.on('message', async (data) => {
      try {
        const result = JSON.parse(data);

        if (result.event === 'Shelly:StatusOnChange') {
          if (shellyDevices.length > 0) {
            const filteredShellies = shellyDevices.filter(shelly => String(shelly.id).includes(result.deviceId));
            for (const filteredShelly of filteredShellies) {
              filteredShelly.device.parseStatusUpdate(result.status);
              await this.util.sleep(5);
            }
          }
        }
      } catch (error) {
        this.log(error);
      }

    });

    ws.on('error', (error) => {
      this.log(error);
      ws.close();
    });

    ws.on('close', () => {
      clearTimeout(wsReconnectTimeout);
      wsConnected = false;

      wsReconnectTimeout = setTimeout(() => {
        this.websocketCloudListener();
      }, 60000);
    });

  }

  // CLOUD: SEND COMMANDS OVER WEBSOCKET
  async websocketSendCommand(commands) {
    try {
      for (let command of commands) {
    		ws.send(command);
    		await this.util.sleep(5);
    	}
      return Promise.resolve(true);
    } catch (error) {
      this.log(error);
      return Promise.reject(error);
    }
  }

  // CLOUD: FABRICATE SHELLY INTEGRATOR PORTAL URL
  async getIntegratorUrl() {
    const homeyId = await this.homey.cloud.getHomeyId();
    return 'https://my.shelly.cloud/integrator.html?itg='+ Homey.env.SHELLY_TAG +'&cb=https://webhooks.athom.com/webhook/612d067f7e30630ba2b81d11/?homey='+ homeyId
  }

  // CLOUD: RETURN SHARED CLOUD DEVICE FOR PAIRING
  async getPairingDevice() {
    return cloudPairingDevice;
  }

}

module.exports = ShellyApp;
