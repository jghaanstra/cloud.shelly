'use strict';

const fetch = require('node-fetch');
const fs = require('fs');
const tinycolor = require("tinycolor2");
let deviceColors = {};

class Util {

  constructor(opts) {
    this.homey = opts.homey;
  }

  sendCommand(endpoint, address, username, password, type = 'request') {
    return new Promise((resolve, reject) => {
      fetch('http://'+ address + endpoint, {
          method: 'GET',
          headers: {'Authorization': 'Basic ' + Buffer.from(username + ":" + password).toString('base64')}
        })
        .then(this.checkStatus)
        .then(res => res.json())
        .then(json => {
          return resolve(json);
        })
        .catch(error => {
          if (type == 'request') {
            console.error(error);
          }
          return reject(error);
        });
    })
  }

  addCallbackEvents(path, urls, device, deviceid, ip, username, password, channel = 99) {
    return new Promise(async (resolve, reject) => {
      try {
        const homeyip = await this.homey.cloud.getLocalAddress();
        for (let index = 0; index < urls.length; index++) {
          if (urls[index] == 'report') {
            var command = path + urls[index] +'_url=http://'+ homeyip +'/api/app/cloud.shelly/report_status/'+ device +'/'+ deviceid +'/';
          } else {
            if (channel !== 99) {
              var command = path + urls[index] +'_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/'+ device +'/'+ deviceid +'/'+ urls[index] + '_'+ channel +'/';
            } else {
              var command = path + urls[index] +'_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/'+ device +'/'+ deviceid +'/'+ urls[index] + '/';
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

  removeCallbackEvents(path, urls, ip, username, password) {
    return new Promise(async (resolve, reject) => {
      try {
        for (let index = 0; index < urls.length; index++) {
          let command = path + urls[index] +'_url=null';
          await this.sendCommand(command, ip, username, password);
        }
        return resolve();
      } catch (error) {
        return reject(error);
      }
    });
  }

  getShellies() {
    const drivers = Object.values(this.homey.drivers.getDrivers());
    const shellies = [];
    for (const driver of drivers) {
      const devices = driver.getDevices();
      let manifest = driver.manifest;
      for (const device of devices) {
        const actions = device.getCallbacks();
        if (actions.length > 0) {
          shellies.push(
            {
              id: device.getData().id,
              name: device.getName(),
              icon: manifest.icon,
              driver: manifest.id,
              type: device.getStoreValue('type'),
              main_device: device.getStoreValue('main_device') || undefined,
              actions: actions
            }
          )
        }
      }
    }
    return Promise.resolve(shellies);
  }

  async getActions(actions) {
    const action = [];
    for (let index = 0; index < actions.length; index++) {
      if (actions[index] !== 'report') {
        action.push(
          {
            name: actions[index],
            icon: '/assets/icon.svg'
          }
        )
      }
    }
    return Promise.resolve(action);
  }

  async processDeviceChange(shellies, deviceid, prop, newValue, oldValue) {
    try {
      console.log(prop, 'changed from', oldValue, 'to', newValue, 'for device', deviceid);
      const shelly = shellies.filter(obj => Object.keys(obj).some(key => obj[key].includes(deviceid)));
      if (shelly.length > 0) {
        const channel = prop.slice(prop.length - 1);
        const identifier = shelly.length > 1 ? shelly[0].main_device+'-channel-'+channel : shelly[0].id;
        const device = this.homey.drivers.getDriver(shelly[0].driver).getDevice({id: identifier});
        const parseCapability = this.coapToCapabilityParser(prop, newValue, shelly[0].driver, deviceid);

        if (!parseCapability === false && device.hasCapability(parseCapability.capability)) {
          if (parseCapability.value !== device.getCapabilityValue(parseCapability.capability)) {
            device.setCapabilityValue(parseCapability.capability, parseCapability.value);
          }
        }

        return Promise.resolve(true);
      } else {
        console.log('No matching Homey device found for discovered coap device', deviceid);
        return Promise.resolve('No matching Homey device found for discovered coap device', deviceid);
      }
    } catch (error) {
      console.log(error);
      return Promise.reject(error);
    }
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

  coapToCapabilityParser(prop, value, driver, deviceid) {
    if (prop === 'relay0' || prop === 'relay1' || prop === 'relay2' || prop === 'relay3' || prop === 'switch' || prop === 'switch0' || prop === 'switch1' || prop === 'switch2' || prop === 'switch3') {
      return {capability: 'onoff', value: value};
    } else if (prop === 'power0' || prop === 'power1' || prop === 'power2' || prop === 'power3') {
      return {capability: 'measure_power', value: value};
    } else if (prop === 'energyCounter0' || prop === 'energyCounter1' || prop === 'energyCounter2' || prop === 'energyCounter3') {
      return {capability: 'meter_power', value: value};
    } else if (prop === 'energyReturned0' || prop === 'energyReturned1' || prop === 'energyReturned2' || prop === 'energyReturned3') {
      return {capability: 'meter_power_returned', value: value};
    } else if (prop === 'powerFactor0' || prop === 'powerFactor1' || prop === 'powerFactor2' || prop === 'powerFactor3') {
      return {capability: 'meter_power_factor', value: value};
    } else if (prop === 'current0' || prop === 'current1' || prop === 'current2' || prop === 'current3') {
      return {capability: 'measure_current', value: value};
    } else if (prop === 'voltage0' || prop === 'voltage1' || prop === 'voltage2' || prop === 'voltage3') {
      return {capability: 'measure_voltage', value: value};
    } else if (prop === 'battery') {
      return {capability: 'measure_battery', value: value};
    } else if (prop === 'temperature' || prop === 'deviceTemperature' || (prop === 'externalTemperature0' && driver === 'shelly1')) {
      return {capability: 'measure_temperature', value: value};
    } else if ((prop === 'externalTemperature1' && driver === 'shelly1') || (prop === 'externalTemperature0' && driver === 'shelly1pm')) {
      return {capability: 'measure_temperature.1', value: value};
    } else if ((prop === 'externalTemperature2' && driver === 'shelly1') || (prop === 'externalTemperature1' && driver === 'shelly1pm')) {
      return {capability: 'measure_temperature.2', value: value};
    } else if ((prop === 'externalTemperature2' && driver === 'shelly1pm')) {
      return {capability: 'measure_temperature.3', value: value};
    } else if (prop === 'rollerState') {
      switch(value) {
        case 'stop':
          var state = 'idle'
          break;
        case 'open':
          var state = 'up';
          break;
        case 'close':
          var state = 'down';
          break;
        default:
          var state = value;
      }
      return {capability: 'windowcoverings_state', value: state};
    } else if (prop === 'rollerPosition') {
      const position = value >= 100 ? 1 : value / 100;
      return {capability: 'windowcoverings_set', value: position};
    } else if (prop === 'gain' || (driver === 'shellyduo' && prop === 'brightness') || (driver === 'shellyvintage' && prop === 'brightness')) {
      const dim = value >= 100 ? 1 : value / 100;
      return {capability: 'dim', value: dim};
    } else if (prop === 'white' || (prop === 'brightness' && driver === 'shellybulb') || (driver === 'shellyrgbw2color' && prop === 'brightness') || (driver === 'shellyrgbw2white' && (prop === 'brightness0' || prop === 'brightness1' || prop === 'brightness2' || prop === 'brightness3'))) {
      const white = 1 - Number(this.normalize(value, 0, 255));
      return {capability: 'light_temperature', value: white};
    } else if (prop === 'whiteLevel') {
      const white = 1 - (value / 100);
      return {capability: 'light_temperature', value: white};
    } else if (driver === 'shellybulb' && prop === 'colorTemperature') {
      const light_temp = this.normalize(value, 3000, 6500);
      return {capability: 'light_temperature', value: light_temp};
    } else if (prop === 'red' || prop === 'green' || prop === 'blue' ) {
      // TODO: this is a bit hacky to return hue and saturation, come up with a better solution
      clearTimeout(this.updateHueTimeout);
      clearTimeout(this.updateSaturationTimeout);
      switch (prop) {
        case 'red':
          deviceColors[deviceid].red = value;
          break;
        case 'green':
          deviceColors[deviceid].green = value;
          this.updateHueTimeout = setTimeout(async () => {
            const color = tinycolor({ r: deviceColors[deviceid].red, g: deviceColors[deviceid].green, b: deviceColors[deviceid].blue });
            let hsv = color.toHsv();
            let hue = Number((hsv.h / 360).toFixed(2));
            return {capability: 'light_hue', value: hue};
          }, 1000);
          break;
        case 'blue':
          deviceColors[deviceid].green = value;
          this.updateSaturationTimeout = setTimeout(async () => {
            const color = tinycolor({ r: deviceColors[deviceid].red, g: deviceColors[deviceid].green, b: deviceColors[deviceid].blue });
            let hsv = color.toHsv();
            return {capability: 'light_staturation', value: hsv.s};
          }, 1000);
          break;
        default:
          return false;
      }
    } else if (prop === 'mode') {
      const mode = value === 'white' ? 'temperature' : 'color';
      return {capability: 'light_mode', value: mode};
    } else if (prop === 'state') {
      const alarm = value === 'open' ? true : false;
      return {capability: 'alarm_contact', value: mode};
    } else if (prop === 'tilt') {
      return {capability: 'tilt', value: value};
    } else if (prop === 'vibration') {
      const alarm = value === 1 ? true : false;
      return {capability: 'alarm_tamper', value: alarm};
    } else if (prop === 'illuminance') {
      return {capability: 'measure_luminance', value: value};
    } else if (prop === 'flood') {
      const alarm = value === 1 ? true : false;
      return {capability: 'alarm_water', value: alarm};
    } else if (prop === 'gas') {
      const alarm = value === 'mild' || value === 'heavy' ? true : false;
      return {capability: 'alarm_smoke', value: alarm};
    } else if (prop === 'smoke') {
      return {capability: 'alarm_smoke', value: alarm};
    } else if (prop === 'concentration') {
      return {capability: 'gas_concentration', value: value};
    } else if (prop === 'humidity') {
      return {capability: 'measure_humidity', value: value};
    } else if (prop === 'input0' || prop === 'input1' || prop === 'input2' || prop === 'input3') {
      const alarm = value === 1 ? true : false;
      return {capability: 'alarm_generic', value: alarm};
    } else {
      return false;
    }
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
        throw new Error(error.status+': '+ this.homey.__('pair.unknownerror'));
      }
    }
  }
}

module.exports = Util;
