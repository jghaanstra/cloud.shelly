'use strict';

const fetch = require('node-fetch');
const fs = require('fs');
const tinycolor = require("tinycolor2");
const actionEvents = {
  'S': 'shortpush',
  'L': 'longpush',
  'SS': 'double_shortpush',
  'SSS': 'triple_shortpush',
  'LS': 'longpush_shortpush',
  'SL': 'shortpush_longpush'
}

class Util {

  constructor(opts) {
    this.homey = opts.homey;
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

  addCallbackEvents(path, actions, device, deviceid, ip, username, password, channel = 99) {
    // TODO: remove after 3.1.0
    return new Promise(async (resolve, reject) => {
      try {
        const homeyip = await this.homey.cloud.getLocalAddress();
        for (let index = 0; index < actions.length; index++) {
          if (actions[index] == 'report') {
            var command = path + actions[index] +'_url=http://'+ homeyip +'/api/app/cloud.shelly/report_status/'+ device +'/'+ deviceid +'/';
          } else {
            if (channel !== 99) {
              var command = path + actions[index] +'_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/'+ device +'/'+ deviceid +'/'+ actions[index] + '_'+ channel +'/';
            } else {
              var command = path + actions[index] +'_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/'+ device +'/'+ deviceid +'/'+ actions[index] + '/';
            }
          }
          await this.sendCommand(command, ip, username, password);
        }
        this.rebootTimeout = setTimeout(async () => {
          clearTimeout(this.rebootTimeout);
          await this.sendCommand('/reboot', ip, username, password);
        }, 20000);
        return resolve();
      } catch (error) {
        console.log(error);
        return reject(error);
      }
    });
  }

  removeCallbackEvents(path, actions, ip, username, password) {
    // TODO: remove after 3.1.0
    return new Promise(async (resolve, reject) => {
      try {
        for (let index = 0; index < actions.length; index++) {
          let command = path + actions[index] +'_url&urls[]=';
          await this.sendCommand(command, ip, username, password);
        }
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  }

  getShellies(purpose) {
    try {
      const drivers = Object.values(this.homey.drivers.getDrivers());
      const shellies = [];
      let allActions = [];
      for (const driver of drivers) {
        const devices = driver.getDevices();
        let manifest = driver.manifest;
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
            const actions = device.getCallbacks();
            let tempActions = allActions;
            allActions = tempActions.concat(actions.filter((item) => tempActions.indexOf(item) < 0))
            shellies.push(
              {
                id: device.getData().id,
                name: device.getName(),
                ip: device.getSetting('address'),
                username: device.getSetting('username'),
                password: device.getSetting('password'),
                icon: manifest.icon,
                driver: manifest.id,
                type: device.getStoreValue('type'),
                actions: actions
              }
            )
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

  async getActions(actions) {
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
              name: actions[index],
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
        if (settings.coiot.hasOwnProperty("peer")) {
          const homey_ip = await this.homey.cloud.getLocalAddress();
          const result = await this.sendCommand('/settings?coiot_enable=true&coiot_peer='+ homey_ip.substring(0, homey_ip.length-3), address, username, password);
          const reboot = await this.sendCommand('/reboot', address, username, password);
          return resolve(true);
        } else {
          return reject('Device with IP address '+ address +' does not support unicast, make sure you update your Shelly to the latest firmware.');
        }
      } catch (error) {
        return reject(error);
      }
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
    return actionEvents[code];
  }

  normalize(value, min, max) {
    var normalized = (value - min) / (max - min);
    return Number(normalized.toFixed(2));
  }

  denormalize(normalized, min, max) {
    var denormalized = ((1 - normalized) * (max - min) + min);
    return Number(denormalized.toFixed(0));
  }

  checkStatus = (res) => {
    if (res.ok) {
      return res;
    } else {
      if (res.status == 401) {
        throw new Error(this.homey.__('util.401'));
      } else if (res.status == 502 || res.status == 504) {
        throw new Error(this.homey.__('util.502'));
      } else if (res.status == 500) {
        throw new Error(this.homey.__('util.500'));
      } else {
        throw new Error(res.status+': '+ this.homey.__('util.unknownerror'));
      }
    }
  }
}

module.exports = Util;
