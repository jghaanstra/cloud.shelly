'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const shellies = require('shellies');
let shellyDevices = {};

class ShellyApp extends Homey.App {

  onInit() {
    this.log('Initializing Shelly App ...');

    if (!this.util) this.util = new Util({homey: this.homey});

    // INITIALLY UPDATE THE SHELLY COLLECTION
    setTimeout(async () => {
      await this.updateShellyCollection();
    }, 30000);

    // START COAP LISTENER FOR RECEIVING STATUS UPDATES
    setTimeout(async () => {
      shellies.start();
    }, 40000);

    // UPDATE THE SHELLY COLLECTION REGULARLY
    setInterval(async () => {
      await this.updateShellyCollection();
    }, 300000);

    // GENERIC FLOWCARDS
    this.homey.flow.getTriggerCard('triggerDeviceOffline');

    const listenerCallbacks = this.homey.flow.getTriggerCard('triggerCallbacks').registerRunListener(async (args, state) => {
      try {
        if ((state.id == args.shelly.id && args.action.id === 999) || (args.shelly.id === 'all' && state.action == args.action.name) || (args.shelly.id === 'all' && args.action.id === 999) || ((state.id == args.shelly.id || args.shelly == undefined) && (state.action == args.action.name || args.action == undefined))) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      } catch (error) {
        return Promise.reject(error);
      }
    });
    listenerCallbacks.getArgument('shelly').registerAutocompleteListener(async (query, args) => {
      return await this.util.getShellies('actions');
    });
    listenerCallbacks.getArgument('action').registerAutocompleteListener(async (query, args) => {
      return await this.util.getActions(args.shelly.actions);
    });

    this.homey.flow.getConditionCard('conditionInput1')
      .registerRunListener(async (args) => {
        if (args.device) {
          return args.device.getCapability("alarm_generic.1");
        } else {
          return false;
        }
      })

    this.homey.flow.getConditionCard('conditionInput2')
      .registerRunListener(async (args) => {
        if (args.device) {
          return args.device.getCapability("alarm_generic.2");
        } else {
          return false;
        }
      })

    this.homey.flow.getConditionCard('conditionFW')
      .registerRunListener(async (args) => {
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
        return await this.util.sendCommand('/reboot', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    this.homey.flow.getActionCard('actionOTAUpdate')
      .registerRunListener(async (args) => {
        return await this.util.sendCommand('/ota?update=true', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    // SHELLY 1
    this.homey.flow.getActionCard('flipbackSwitch')
      .registerRunListener(async (args) => {
        if (args.switch === '1') {
          return await this.util.sendCommand('/relay/0?turn=on&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else {
          return await this.util.sendCommand('/relay/0?turn=off&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        }
      })

    // SHELLY 2 & SHELLY 4 PRO
    this.homey.flow.getActionCard('flipbackSwitch2')
      .registerRunListener(async (args) => {
        if (args.switch === '1') {
          return await this.util.sendCommand('/relay/'+ args.relay +'?turn=on&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else {
          return await this.util.sendCommand('/relay/'+ args.relay +'?turn=off&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        }
      })

    this.homey.flow.getActionCard('flipbackSwitch4')
      .registerRunListener(async (args) => {
        if (args.switch === '1') {
          return await this.util.sendCommand('/relay/'+ args.relay +'?turn=on&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else {
          return await this.util.sendCommand('/relay/'+ args.relay +'?turn=off&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        }
      })

    // SHELLY RGBW2
    this.homey.flow.getActionCard('flipbackSwitchRGBW2Color')
      .registerRunListener(async (args) => {
        if (args.switch === '1') {
          return await this.util.sendCommand('/color/0?turn=on&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else {
          return await this.util.sendCommand('/color/0?turn=off&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        }
      })

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
        } else if (args.device.getStoreValue('last_action') == 'up') {
          args.device.setStoreValue('last_action', 'down');
          args.device.setCapabilityValue('windowcoverings_state','down');
          return await this.util.sendCommand('/roller/0?go=close', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else if (args.device.getStoreValue('last_action') == 'down') {
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

    // SHELLY DUO
    this.homey.flow.getActionCard('actionDuoDimTemperature')
      .registerRunListener(async (args) => {
        try {
          let light_temperature = 1 - Number(this.util.normalize(args.light_temperature, 2700, 6500));

          args.device.triggerCapabilityListener("dim", args.brightness);
          args.device.triggerCapabilityListener("light_temperature", light_temperature);
          return Promise.resolve(true);
        } catch (error) {
          return Promise.reject(error);
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

    // COAP DISCOVERY AND MESSAGES
    shellies.on('discover', device => {
      this.log('Discovered device with ID', device.id, 'and type', device.type, 'on IP address', device.host);

      device.on('change', (prop, newValue, oldValue) => {
        try {
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
              const homeydevice = this.homey.drivers.getDriver(filteredShellies[0].driver).getDevice({id: deviceid});
              homeydevice.deviceCoapReport(prop, newValue);
              if (homeydevice.getSetting('address') !== device.host) {
                homeydevice.setSettings({address: device.host});
              }
              return;
            } else {
              this.log(prop, 'changed from', oldValue, 'to', newValue, 'for device', device.id, 'but this device has not been added to Homey yet.');
            }
          } else {
            this.log(prop, 'changed from', oldValue, 'to', newValue, 'for device', device.id, 'but no Shelly devices have been added to Homey yet.');
          }
        } catch (error) {
          this.log('Error processing CoAP message for device', device.id, 'with type', device.type, 'on capability', prop, 'with old value', oldValue, 'to new value', newValue);
          this.log(error);
        }
      })

      device.on('offline', () => {
        const offlineShellies = shellyDevices.filter(shelly => shelly.id.includes(device.id));
        if (offlineShellies.length > 0) {
          Object.keys(offlineShellies).forEach(key => {
            const device = this.homey.drivers.getDriver(offlineShellies[key].driver).getDevice({id: offlineShellies[key].id});
            this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": device.getName(), "device_error": 'Device is offline'});
          });
        }
      })
    });

  }

  async updateShellyCollection() {
    try {
      shellyDevices = await this.util.getShellies();
      return Promise.resolve(true);
    } catch(error) {
      return Promise.reject(error);
    }
  }

}

module.exports = ShellyApp;
