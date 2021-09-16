'use strict';

const fetch = require('node-fetch');
const fs = require('fs');
const tinycolor = require("tinycolor2");

class Util {

  constructor(opts) {
    this.homey = opts.homey;

    this.actionEventsStatusUpdate = {
      'S': 'shortpush',
      'L': 'longpush',
      'SS': 'double_shortpush',
      'SSS': 'triple_shortpush',
      'LS': 'longpush_shortpush',
      'SL': 'shortpush_longpush',
      'single': 'shortpush',
      'single_push': 'shortpush',
      'long': 'longpush',
      'long_push': 'longpush',
      'double': 'double_shortpush',
      'double_push': 'double_shortpush',
    }
    this.actionEventsFlowcard = {
      'shortpush': 'Short Push',
      'shortpush_1': 'Short Push 1',
      'shortpush_2': 'Short Push 2',
      'shortpush_3': 'Short Push 3',
      'longpush': 'Long Push',
      'longpush_1': 'Long Push 1',
      'longpush_2': 'Long Push 2',
      'longpush_3': 'Long Push 3',
      'double_shortpush': 'Double Short Push',
      'double_shortpush_1': 'Double Short Push 1',
      'double_shortpush_2': 'Double Short Push 2',
      'double_shortpush_3': 'Double Short Push 3',
      'triple_shortpush': 'Triple Short Push',
      'triple_shortpush_1': 'Triple Short Push 1',
      'triple_shortpush_2': 'Triple Short Push 2',
      'triple_shortpush_3': 'Triple Short Push 3',
      'longpush_shortpush': 'Long Push Short Push',
      'shortpush_longpush': 'Short Push Long Push'
    }
    this.deviceCodes = {
      'SHPLG-1'       : 'shellyplug-',
      'SHPLG2-1'      : 'shellyplug-',
      'SHPLG-U1'      : 'shellyplug-',
      'SHPLG-S'       : 'shellyplug-s-',
      'SHSW-1'        : 'shelly1-',
      'SNSW-001X16EU' : 'ShellyPlus1-',
      'SHSW-PM'       : 'shelly1pm-',
      'SNSW-001P16EU' : 'ShellyPlus1PM-',
      'SHSW-21'       : 'shellyswitch-',
      'SHEM-3'        : 'shellyem3-',
      'SHSW-44'       : 'shelly4pro-',
      'SPSW-004PE16EU': 'ShellyPro4PM-',
      'SHSW-25'       : 'shellyswitch25-',
      'SHAIR-1'       : 'shellyair-',
      'SHBLB-1'       : 'shellybulb-',
      'SHCB-1'        : 'shellycolorbulb-',
      'SHBTN-1'       : 'shellybutton1-',
      'SHBTN-2'       : 'shellybutton1-',
      'SHDM-1'        : 'shellydimmer-',
      'SHDM-2'        : 'shellydimmer2-',
      'SHBDUO-1'      : 'ShellyBulbDuo-',
      'SHDW-1'        : 'shellydw-',
      'SHDW-2'        : 'shellydw2-',
      'SHEM'          : 'shellyem-',
      'SHWT-1'        : 'shellyflood-',
      'SHGS-1'        : 'shellygas-',
      'SHHT-1'        : 'shellyht-',
      'SHIX3-1'       : 'shellyix3-',
      'SHMOS-01'      : 'shellymotionsensor-',
      'SHRGBWW-01'    : 'shellyrgbw-',
      'SHRGBW2'       : 'shellyrgbw2-',
      'SHSM-01'       : 'shellysmoke-',
      'SHSM-02'       : 'shellysmoke2-',
      'SHUNI-1'       : 'shellyuni-',
      'SHVIN-1'       : 'ShellyVintage-'
    }
  }

  sendCommand(endpoint, address, username, password) {
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
  }

  sendCloudCommand(endpoint, address, token, device_id, body = null) {
    return new Promise((resolve, reject) => {
      let options = {};
      if (body !== null) {
        const formData = new URLSearchParams({
          'auth_key': token,
          'id': device_id
        });
        Object.keys(body).forEach(function(key) {
          formData.append(key, body[key]);
        })
        options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData
        }
      } else {
        options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            'auth_key': token,
            'id': device_id
          })
        }
      }
      fetch('https://'+ address + endpoint, options)
        .then(this.checkStatusCloud)
        .then(res => res.json())
        .then(json => {
          return resolve(json);
        })
        .catch(error => {
          return reject(error);
        });
    })
  }

  getShellies(purpose) {
    try {
      const drivers = Object.values(this.homey.drivers.getDrivers());
      const shellies = [];
      let allActions = [];
      for (const driver of drivers) {
        const devices = driver.getDevices();
        for (const device of devices) {
          if (purpose === 'collection') {
            shellies.push(
              {
                id: device.getData().id,
                name: device.getName(),
                main_device: device.getStoreValue('main_device') || 'none',
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
        if (actions[index] !== 'report') {
          action.push(
            {
              id: index,
              name: this.getActionEventDescriptionFlowcard(actions[index]),
              action: actions[index],
              icon: '/assets/icon.svg'
            }
          )
        }
      }
      return Promise.resolve(action);
    } catch (error) {
      console.log(error);
      return Promise.resolve(action);
    }
  }

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

  async getCloudDetails() {
    try {
      var cloudInstall = false;
      var server_address = '';
      const drivers = await Object.values(this.homey.drivers.getDrivers());
      for (const driver of drivers) {
        if (driver.manifest.id.includes('cloud')) {
          cloudInstall = true;
          const devices = await driver.getDevices();
          if (devices.length > 0) {
            for (let device of devices) {
          		if (device.getStoreValue('communication') === 'cloud') {
                server_address = device.getSetting('server_address');
                break;
              }
          	}
          }
        }
      }
      return Promise.resolve({"cloudInstall": cloudInstall, "server_address": server_address});
    } catch (error) {
      console.log(error);
      return Promise.reject(error);
    }
  }

  getJWTToken(tag, token) {
    return new Promise((resolve, reject) => {
      let options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          'itg': tag,
          'token': token
        })
      };
      fetch('https://api.shelly.cloud/integrator/get_access_token', options)
        .then(this.checkStatusCloud)
        .then(res => res.json())
        .then(json => {
          return resolve(json.data);
        })
        .catch(error => {
          return reject(error);
        });
    })
  }

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

  getActionEventDescription(code) {
    return this.actionEventsStatusUpdate[code];
  }

  getActionEventDescriptionFlowcard(code) {
    return this.actionEventsFlowcard[code];
  }

  normalize(value, min, max) {
    var normalized = (value - min) / (max - min);
    return Number(normalized.toFixed(2));
  }

  denormalize(normalized, min, max) {
    var denormalized = ((1 - normalized) * (max - min) + min);
    return Number(denormalized.toFixed(0));
  }

  getRandomTimeout(max) {
    return (Math.floor(Math.random() * Math.floor(max)) * 1000);
  }

  sleep(s) {
  	return new Promise(resolve => setTimeout(resolve, s))
  }

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

  checkStatusCloud = (res) => {
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
