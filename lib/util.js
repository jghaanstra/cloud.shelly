'use strict';

const fetch = require('node-fetch');
const fs = require('fs');
const tinycolor = require("tinycolor2");
const Auth = require('http-auth-client');
const crypto = require('crypto');

class Util {

  constructor(opts) {
    this.homey = opts.homey;
    this.digests = {};
    this.digest_retries = {};
    this.devicetypes = {
      gen1: false,
      gen2: false,
      cloud: false
    }

    // TODO: One Driver ToDo list
    /*
    * manual pairing
    * multi channel pairing capabilities
    * setting capability options


    */

    this.deviceConfig = [
      {
        'hostname': ['shellyplug-'],
        'name': 'Shelly Plug',
        'gen': 'gen1',
        'type': ['SHPLG-1', 'SHPLG2-1', 'SHPLG-U1'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'capabilities_1': ["onoff", "measure_power", "meter_power", "rssi"],
        'capabilities_2': [],
        'capability_options': {},
        'icon': 'shellyplug.svg'
      },
      {
        'hostname': ['shellyplug-s-'],
        'name': 'Shelly Plug S',
        'gen': 'gen1',
        'type': ['SHPLG-S'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_temperature", "rssi"],
        'capabilities_2': [],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'icon': 'shellyplug-s.svg'
      }
    ]

    this.actionEventsStatusMapping = {
      'coap': {
        'S': 'shortpush',
        'L': 'longpush',
        'SS': 'double_shortpush',
        'SSS': 'triple_shortpush',
        'LS': 'longpush_shortpush',
        'SL': 'shortpush_longpush'
      },
      'websocket': {
        'single_push': 'single_push',
        'long_push': 'long_push',
        'double_push': 'double_push',
        'btn_down': 'btn_down',
        'btn_up': 'btn_up'
      },
      'cloud': {
        'gen1': {
          'S': 'shortpush',
          'L': 'longpush',
          'SS': 'double_shortpush',
          'SSS': 'triple_shortpush',
          'LS': 'longpush_shortpush',
          'SL': 'shortpush_longpush'
        },
        'gen2': {
          'S': 'single_push',
          'L': 'long_push',
          'SS': 'double_push',
        }
      }
    }

    this.actionEventsFlowcard = {
      'single_push': 'Single Push',
      'single_push_1': 'Single Push 1',
      'single_push_2': 'Single Push 2',
      'single_push_3': 'Single Push 3',
      'single_push_4': 'Single Push 4',
      'shortpush': 'Short Push',
      'shortpush_1': 'Short Push 1',
      'shortpush_2': 'Short Push 2',
      'shortpush_3': 'Short Push 3',
      'longpush': 'Long Push',
      'longpush_1': 'Long Push 1',
      'longpush_2': 'Long Push 2',
      'longpush_3': 'Long Push 3',
      'long_push': 'Long Push',
      'long_push_1': 'Long Push 1',
      'long_push_2': 'Long Push 2',
      'long_push_3': 'Long Push 3',
      'long_push_4': 'Long Push 4',
      'double_push': 'Double Push',
      'double_push_1': 'Double Push 1',
      'double_push_2': 'Double Push 2',
      'double_push_3': 'Double Push 3',
      'double_push_4': 'Double Push 4',
      'double_shortpush': 'Double Short Push',
      'double_shortpush_1': 'Double Short Push 1',
      'double_shortpush_2': 'Double Short Push 2',
      'double_shortpush_3': 'Double Short Push 3',
      'triple_shortpush': 'Triple Short Push',
      'triple_shortpush_1': 'Triple Short Push 1',
      'triple_shortpush_2': 'Triple Short Push 2',
      'triple_shortpush_3': 'Triple Short Push 3',
      'longpush_shortpush': 'Long Push Short Push',
      'shortpush_longpush': 'Short Push Long Push',
      'btn_down': 'Button Down',
      'btn_down_1': 'Button Down 1',
      'btn_down_2': 'Button Down 2',
      'btn_down_3': 'Button Down 3',
      'btn_down_4': 'Button Down 4',
      'btn_up': 'Button Up',
      'btn_up_1': 'Button Up 1',
      'btn_up_2': 'Button Up 2',
      'btn_up_3': 'Button Up 3',
      'btn_up_4': 'Button Up 4'
    }
  }

  /* GENERIC FUNCTION FOR SENDING HTTP COMMANDS */
  sendCommand(endpoint, address, username, password) {
    try {
      return new Promise((resolve, reject) => {
        let options = {};
        if (username && password) {
          options = {
            method: 'GET',
            headers: {'Authorization': 'Basic ' + Buffer.from(username + ":" + password).toString('base64')}
          }
        } else {
          options = {
            method: 'GET'
          }
        }
        fetch('http://'+ address + endpoint, options)
          .then(this.checkStatus)
          .then(res => res.json())
          .then(json => {
            return resolve(json);
          })
          .catch(error => {
            return reject(error);
          });
      })
    } catch (error) {
      console.log(error);
    }
  }

  /* GENERIC FUNCTION FOR SENDING HTTP COMMANDS WITH DIGEST AUTHENTICATION FOR GEN2 */
  async sendRPCCommand(endpoint, address, password, requesttype='GET', payload={}) {
    try {
      return new Promise(async (resolve, reject) => {
        let options = {}
        if (this.digests[address]) {
          options = {
            method: requesttype,
            headers: {
              "Content-Type": "application/json",
              "Authorization": this.digests[address],
            }
          }
        } else {
          options = {
            method: requesttype,
            headers: {
              "Content-Type": "application/json"
            }
          }
        }
        if (Object.keys(payload).length !== 0) {
          options.body = payload;
        }
        if (!this.digest_retries[address]) {
          this.digest_retries[address] = 0;
        }
        fetch('http://'+ address + endpoint, options)
          .then(async res => {
              if (res.status === 200 ) {
                this.digest_retries[address] = 0;
                return res.json();
              } else if (res.status === 401) {

                // create digest header for digest authentication
                if (res.headers.get("www-authenticate") != undefined && (this.digest_retries[address] <= 2 || this.digest_retries[address] == undefined)) {
                  this.digest_retries[address]++;
                  const challenges = Auth.parseHeaders(res.headers.get("www-authenticate"));
                  const auth = Auth.create(challenges);
                  auth.credentials("admin", password);
                  this.digests[address] = auth.authorization(requesttype, endpoint);

                  // resending command with digest authentication and ending current 401 request
                  this.sendRPCCommand(endpoint, address, password);
                  throw new Error(res.status + ' '+ res.statusText +' - unauthenticated digest request. Retrying to create valid digest authentication.');
                } else {
                  throw new Error(this.homey.__('util.401') +' Error message: '+ res.statusText + '. Too many retries or no authenticate header for digest authentication present');
                }
              } else {
                this.checkStatus(res);
              }
            })
          .then(json => {
            return resolve(json);
          })
          .catch(error => {
            return reject(error);
          });
      });
    } catch (error) {
      console.log(error);
    }
  }

  /* FUNCTION FOR CREATING A PAIRED SHELLY COLLECTION - USED TO MATCH INCOMING STATUS UPDATES */
  getShellies(purpose) {
    try {
      const drivers = Object.values(this.homey.drivers.getDrivers());
      const shellies = [];
      let allActions = [];
      for (const driver of drivers) {
        const devices = driver.getDevices();
        for (const device of devices) {
          if (purpose === 'collection') {
            if (device.getStoreValue('communication') === 'cloud') {
              this.devicetypes.cloud = true;
            } else {
              switch (device.getStoreValue('gen')) {
                case 'gen1':
                  this.devicetypes.gen1 = true;
                  break;
                case 'gen2':
                  this.devicetypes.gen2 = true;
                  break
                default:
                  break;
              }
            }
            shellies.push(
              {
                id: device.getData().id,
                name: device.getName(),
                main_device: device.getStoreValue('main_device'),
                gen: device.getStoreValue('gen'),
                communication: device.getStoreValue('communication'),
                device: device
              }
            )
          } else if (purpose === 'flowcard') {
            if (device.callbacks.length > 0) {
              let manifest = driver.manifest;
              let tempActions = allActions;
              allActions = tempActions.concat(device.callbacks.filter((item) => tempActions.indexOf(item) < 0));
              shellies.push(
                {
                  id: device.getData().id,
                  name: device.getName(),
                  icon: manifest.icon,
                  actions: device.callbacks
                }
              )
            }
          }
        }
      }
      const sortedShellies = shellies.sort((a, b) => a.name.localeCompare(b.name));
      if (purpose === 'flowcard') {
        sortedShellies.unshift({
          id: 'all',
          name: this.homey.__('util.any_device'),
          icon: '/assets/icon.svg',
          actions: allActions
        });
      }
      return Promise.resolve(sortedShellies);
    } catch (error) {
      console.log(error);
      return Promise.reject(error);
    }
  }

  /* FUNCTION TO RETRIEVE AVAILABLE ACTION USED IN THE GENERIC ACTION EVENT FLOWCARD */
  async getActions(actions = []) {
    try {
      let action = [
        {
          id: 999,
          name: this.homey.__('util.any_action'),
          icon: '/assets/icon.svg'
        }
      ];
      for (let index = 0; index < actions.length; index++) {
        action.push(
          {
            id: index,
            name: this.getActionEventDescriptionFlowcard(actions[index]),
            action: actions[index],
            icon: '/assets/icon.svg'
          }
        )
      }
      return Promise.resolve(action);
    } catch (error) {
      console.log(error);
      return Promise.resolve(action);
    }
  }

  /* FUNCTION TO RETRIEVE PROFILES FOR THE SHELLY TRV */
  async getTrvProfiles(address, username, password) {
    try {
      const settings = await this.sendCommand('/settings', address, username, password);
      const profiles = [];
      let profile_id = 0;
      profiles.push(
        {
          id: "0",
          name: "Disabled",
        }
      )
      settings.thermostats[0].schedule_profile_names.forEach(profile => {
        profile_id++;
        profiles.push(
          {
            id: profile_id.toString(),
            name: profile,
          }
        )
      });
      return Promise.resolve(profiles);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /* FUNCTION TO ENABLE UNICAST COAP FOR GEN1 DEVICES */
  setUnicast(address, username, password) {
    return new Promise(async (resolve, reject) => {
      try {
        const settings = await this.sendCommand('/settings', address, username, password);
        if (settings.hasOwnProperty("coiot")) {
          if (settings.coiot.hasOwnProperty("peer")) {
            const homey_ip = await this.homey.cloud.getLocalAddress();
            const result = await this.sendCommand('/settings?coiot_enable=true&coiot_peer='+ homey_ip.substring(0, homey_ip.length-3), address, username, password);
            const reboot = await this.sendCommand('/reboot', address, username, password);
            return resolve('OK');
          }
        } else {
          return resolve('Device with IP address '+ address +' does not support unicast, make sure you update your Shelly to the latest firmware.');
        }
      } catch (error) {
        return reject(error);
      }
    })
  }

  /* FUNCTION TO ADD WEBSOCKET SERVER CONFIG FOR GEN2 DEVICES */
  setWsServer(address, password) {
    return new Promise(async (resolve, reject) => {
      try {
        const homey_ip = await this.homey.cloud.getLocalAddress();
        const config = await this.sendRPCCommand('/rpc/Shelly.GetConfig', address, password);
        if (config.hasOwnProperty("ws")) {
          const payload = '{"id":0, "method":"ws.setconfig", "params":{"config":{"ssl_ca":"*", "server":"ws://'+ homey_ip.slice(0, -3) +':6113/", "enable":true}}}';
          const settings = await this.sendRPCCommand('/rpc', address, password, 'POST', payload);
          const reboot = await this.sendRPCCommand('/rpc/Shelly.Reboot', address, password);
          return resolve('OK');
        } else {
          return resolve('NA');
        }
      } catch (error) {
        return reject(error);
      }
    })
  }

  /* FUNCTION FOR CHECKING IF THIS IS A CLOUD INSTALL */
  async getCloudInstall() {
    try {
      const drivers = await Object.values(this.homey.drivers.getDrivers());
      for (const driver of drivers) {
        if (driver.manifest.id.includes('cloud')) {
          return Promise.resolve(true);
        }
      }
      return Promise.resolve(false);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /* FUNCTION FOR UPLOADING A CUSTOM DEVICE ICON */
  uploadIcon(img, id) {
    return new Promise((resolve, reject) => {
      try {
        const path = "../userdata/"+ id +".svg";
        const base64 = img.replace("data:image/svg+xml;base64,", '');
        fs.writeFile(path, base64, 'base64', (error) => {
          if (error) {
            return reject(error);
          } else {
            return resolve(true);
          }
        });
      } catch (error) {
        return reject(error);
      }
    })
  }

  /* FUNCTION FOR REMOVING A CUSTOM DEVICE ICON */
  removeIcon(iconpath) {
    return new Promise((resolve, reject) => {
      try {
        if (fs.existsSync(iconpath)) {
          fs.unlinkSync(iconpath);
          return resolve(true);
        } else {
          return resolve(true);
        }
      } catch (error) {
        return reject(error);
      }
    })
  }

  getActionEventDescription(code, communication, gen) {
    try {
      let action_event;
      if (communication === 'cloud') {
        action_event = this.actionEventsStatusMapping[communication][gen][code];
      } else {
        action_event = this.actionEventsStatusMapping[communication][code];
      }
      if (typeof action_event === 'string' || action_event instanceof String) {
        return action_event;
      } else {
        return 'n/a';
      }
    } catch (error) {
      console.error(error);
    }
  }

  getDeviceType(type) {
    return this.devicetypes[type];
  }

  getDeviceConfig(hostname) {
    return this.deviceConfig.find(r => r.hostname.includes(hostname));
  }

  getActionEventDescriptionFlowcard(code) {
    return this.actionEventsFlowcard[code];
  }

  normalize(value, min, max) {
    var normalized = (value - min) / (max - min);
    return Number(normalized.toFixed(2));
  }

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  denormalize(normalized, min, max) {
    var denormalized = ((1 - normalized) * (max - min) + min);
    return Number(denormalized.toFixed(0));
  }

  getRandomTimeout(max) {
    return (Math.floor(Math.random() * Math.floor(max)) * 1000);
  }

  sleep(s) {
  	return new Promise(resolve => setTimeout(resolve, s));
  }

  createHash(str) {
    try {
      return crypto.createHash('sha256').update(str).digest("hex");
    } catch (error) {
      console.error(error);
    }
  }

  /* FUNCTION FOR RETURNING A CLOUD WEBSOCKET COMMAND */
  websocketMessage(data) {
    switch(data.event) {
      case 'Integrator:ActionRequest':
        return JSON.stringify({
          event: data.event,
          trid: Math.floor(Math.random() * 999),
          data: { action: 'DeviceVerify', deviceId: data.deviceid }
        });
        break;
      case 'Shelly:CommandRequest':
        return JSON.stringify({
          event: data.event,
          trid: Math.floor(Math.random() * 999),
          deviceId: data.deviceid,
          data: {
            cmd: data.command,
            params: { id: data.channel, [data.command_param]: data.command_value },
          }
        });
        break;
      case 'Shelly:CommandRequest-NoParams':
        return JSON.stringify({
          event: data.event,
          trid: Math.floor(Math.random() * 999),
          deviceId: data.deviceid,
          data: {
            cmd: data.command,
            params: {id: 0}
          }
        });
        break;
      case 'Shelly:CommandRequest-timer':
        return JSON.stringify({
          event: 'Shelly:CommandRequest',
          trid: Math.floor(Math.random() * 999),
          deviceId: data.deviceid,
          data: {
            cmd: data.command,
            params: { id: data.channel, [data.command_param]: data.command_value, [data.timer_param]: data.timer },
          }
        });
      case 'Shelly:CommandRequest-RGB':
        return JSON.stringify({
          event: 'Shelly:CommandRequest',
          trid: Math.floor(Math.random() * 999),
          deviceId: data.deviceid,
          data: {
            cmd: data.command,
            params: { id: data.channel, red: data.red , green: data.green, blue: data.blue },
          }
        });
        break;
      case 'Shelly:CommandRequest-WhiteMode':
        return JSON.stringify({
          event: 'Shelly:CommandRequest',
          trid: Math.floor(Math.random() * 999),
          deviceId: data.deviceid,
          data: {
            cmd: data.command,
            params: { id: data.channel, gain: data.gain , white: data.white },
          }
        });
        break;
      default:
        return JSON.stringify({
          event: "Integrator:ActionRequest",
          trid: Math.floor(Math.random() * 999),
          data: { action: 'DeviceVerify', id: data.deviceid }
        });
        break;
    }
  }

  /* FUNCTION FOR CHECKING THE STATUS FOR REGULAR HTTP COMMANDS */
  checkStatus = (res) => {
    if (res !== undefined) {
      if (res.ok) {
        return res;
      } else {
        if (res.status === 400) {
          console.log(res.statusText);
          throw new Error(this.homey.__('util.400') +' Error message: '+ res.statusText);
        } else if (res.status === 401 || res.status === 404) {
          console.log(res.statusText);
          throw new Error(this.homey.__('util.401') +' Error message: '+ res.statusText);
        } else if (res.status === 502 || res.status === 504) {
          throw new Error(this.homey.__('util.502') +' Error message: '+ res.statusText);
        } else if (res.status === 500) {
          console.log(res.statusText);
          throw new Error(this.homey.__('util.500') +' Error message: '+ res.statusText);
        } else {
          throw new Error(res.status+': '+ this.homey.__('util.unknownerror') +' Error message: '+ res.statusText);
        }
      }
    }
  }

}

module.exports = Util;
