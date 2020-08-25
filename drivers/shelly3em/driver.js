'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
let added_devices = {};
let temp_devices = {};

class Shelly3EmDriver extends Homey.Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.loadDevices();
    this.pollDevices();
  }

  onPair(session) {
    const discoveryStrategy = this.getDiscoveryStrategy();
    const discoveryResults = discoveryStrategy.getDiscoveryResults();
    let selectedDeviceId;
    let deviceArray = {};
    let deviceIcon = 'icon.svg';

    session.setHandler('list_devices', async (data) => {
      const devices = Object.values(discoveryResults).map(discoveryResult => {
        return {
          name: 'Shelly 3EM ['+ discoveryResult.address +']',
          data: {
            id: discoveryResult.id,
          }
        };
      });
      if (devices.length) {
        return devices;
      } else {
        session.showView('select_pairing');
      }
    });

    session.setHandler('get_device', async (data) => {
      try {
        const discoveryResult = discoveryResults[selectedDeviceId];
        if(!discoveryResult) return callback(new Error('Something went wrong'));

        const result = await this.util.sendCommand('/shelly', discoveryResult.address, '', '');
        deviceArray = {
          name: 'Shelly 3EM ['+ discoveryResult.address +']',
          data: {
            id: discoveryResult.id,
          },
          settings: {
            address  : discoveryResult.address,
            username : '',
            password : ''
          },
          store: {
            type: result.type
          },
          icon: deviceIcon
        }
        if (result.auth) {
          session.showView('login_credentials');
        } else {
          session.showView('add_device');
        }
      } catch (error) {
        return Promise.reject(error);
      }
    });

    session.setHandler('manual_pairing', async (data) => {
      try {
        const result = await this.util.sendCommand('/settings', data.address, data.username, data.password);
        const hostname = result.device.hostname;
        if (hostname.startsWith('shellyem3-')) {
          deviceArray = {
            name: 'Shelly 3EM ['+ data.address +']',
            data: {
              id: result.device.hostname,
            },
            settings: {
              address  : data.address,
              username : data.username,
              password : data.password
            },
            store: {
              type: result.device.type
            }
          }
        } else {
          return Promise.reject(this.homey.__('driver.wrongdevice'));
        }
      } catch (error) {
        return Promise.reject(error);
      }
    });

    session.setHandler('list_devices_selection', async (data) => {
      return selectedDeviceId = data[0].data.id;
    });

    session.setHandler('login', async (data) => {
      deviceArray.settings.username = data.username;
      deviceArray.settings.password = data.password;
      return Promise.resolve(true);
    });

    session.setHandler('add_device', async (data) => {
      return Promise.resolve(deviceArray);
    });

    session.setHandler('save_icon', async (data) => {
      try {
        const result = await this.util.uploadIcon(data, selectedDeviceId);
        deviceIcon = "../../../userdata/"+ selectedDeviceId +".svg";
        return Promise.resolve(true);
      } catch (error) {
        return Promise.reject(error);
      }
    });

  }

  // HELPER FUNCTIONS
  loadDevices() {
    added_devices = this.getDevices();
    this.pollDevices();
    return;
  }

  pollDevices() {
    clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(async () => {
      if (added_devices.length > 0) {
        Object.keys(added_devices).forEach(async (key) => {
          if (added_devices[key].getStoreValue("channel") == 0) {
            try {
              let device0_id = added_devices[key].getData().id
              let device1_id = added_devices[key].getStoreValue('main_device') + "-channel-1";
              let device2_id = added_devices[key].getStoreValue('main_device') + "-channel-2";
              let result = await this.util.sendCommand('/status', added_devices[key].getSetting('address'), added_devices[key].getSetting('username'), added_devices[key].getSetting('password'), 'polling');
              clearTimeout(this.offlineTimeout);

              temp_devices[device0_id] = {
                id: device0_id,
                onoff: result.relays[0].ison,
                measure_power: result.emeters[0].power,
                meter_power_factor: result.emeters[0].pf,
                measure_current: result.emeters[0].current,
                measure_voltage: result.emeters[0].voltage,
                meter_power_consumed: result.emeters[0].total,
                meter_power_returned: result.emeters[0].total_returned,
                online: true
              }

              temp_devices[device1_id] = {
                id: device1_id,
                onoff: result.relays[0].ison,
                measure_power: result.emeters[1].power,
                meter_power_factor: result.emeters[1].pf,
                measure_current: result.emeters[1].current,
                measure_voltage: result.emeters[1].voltage,
                meter_power_consumed: result.emeters[1].total,
                meter_power_returned: result.emeters[1].total_returned,
                online: true
              }

              temp_devices[device2_id] = {
                id: device1_id,
                onoff: result.relays[0].ison,
                measure_power: result.emeters[2].power,
                meter_power_factor: result.emeters[2].pf,
                measure_current: result.emeters[2].current,
                measure_voltage: result.emeters[2].voltage,
                meter_power_consumed: result.emeters[2].total,
                meter_power_returned: result.emeters[2].total_returned,
                online: true
              }
            } catch (error) {
              this.log(error);
              if (temp_devices.length > 0) {
                if (temp_devices[device0_id].online == true) {
                  temp_devices[device0_id].online = false;
                }
                if (temp_devices[device1_id].online == true) {
                  temp_devices[device1_id].online = false;
                }
                if (temp_devices[device2_id].online == true) {
                  temp_devices[device2_id].online = false;
                }
              }
              this.offlineTimeout = setTimeout(() => {
                this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": added_devices[key].getName(), "device_error": error.toString()});
              }, 60000 * added_devices[key].getSetting('offline'));
            }
          }
        });
      } else {
        clearInterval(this.pollingInterval);
      }
    }, 5000);
  }

  updateDevices() {
    clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      try {
        if (added_devices.length > 0) {
          Object.keys(added_devices).forEach((key) => {
            if (temp_devices.hasOwnProperty(added_devices[key].getData().id)) {
              if (temp_devices[added_devices[key].getData().id].online == true) {

                if (!added_devices[key].getAvailable()) {
                  added_devices[key].setAvailable();
                }

                // capability onoff
                if (temp_devices[added_devices[key].getData().id].onoff != added_devices[key].getCapabilityValue('onoff')) {
                  added_devices[key].setCapabilityValue('onoff', temp_devices[added_devices[key].getData().id].onoff);
                }
                // capability measure_power
                if (temp_devices[added_devices[key].getData().id].measure_power != added_devices[key].getCapabilityValue('measure_power')) {
                  added_devices[key].setCapabilityValue('measure_power', temp_devices[added_devices[key].getData().id].measure_power);
                }
                // capability meter_power_factor
                if (temp_devices[added_devices[key].getData().id].meter_power_factor != added_devices[key].getCapabilityValue('meter_power_factor')) {
                  added_devices[key].setCapabilityValue('meter_power_factor', temp_devices[added_devices[key].getData().id].meter_power_factor);
                  Homey.ManagerFlow.getCard('trigger', 'triggerMeterPowerFactor').trigger(added_devices[key], {'pf': temp_devices[added_devices[key].getData().id].meter_power_factor}, {});
                }
                // capability measure_current
                if (temp_devices[added_devices[key].getData().id].measure_current != added_devices[key].getCapabilityValue('measure_current')) {
                  added_devices[key].setCapabilityValue('measure_current', temp_devices[added_devices[key].getData().id].measure_current);
                }
                // capability measure_voltage
                if (temp_devices[added_devices[key].getData().id].measure_voltage != added_devices[key].getCapabilityValue('measure_voltage')) {
                  added_devices[key].setCapabilityValue('measure_voltage', temp_devices[added_devices[key].getData().id].measure_voltage);
                }
                // capability meter_power_consumed
                if (temp_devices[added_devices[key].getData().id].meter_power_consumed != added_devices[key].getCapabilityValue('meter_power_consumed')) {
                  added_devices[key].setCapabilityValue('meter_power_consumed', temp_devices[added_devices[key].getData().id].meter_power_consumed);
                  Homey.ManagerFlow.getCard('trigger', 'triggerMeterPowerConsumed').trigger(added_devices[key], {'energy': temp_devices[added_devices[key].getData().id].meter_power_consumed}, {});
                }
                // capability meter_power_returned
                if (temp_devices[added_devices[key].getData().id].meter_power_returned != added_devices[key].getCapabilityValue('meter_power_returned')) {
                  added_devices[key].setCapabilityValue('meter_power_returned', temp_devices[added_devices[key].getData().id].meter_power_returned);
                  Homey.ManagerFlow.getCard('trigger', 'triggerMeterPowerReturned').trigger(added_devices[key], {'energy': temp_devices[added_devices[key].getData().id].meter_power_returned}, {});
                }
              } else {
                added_devices[key].setUnavailable(this.homey.__('device.unreachable'));
              }

            }
          });
        }
      } catch (error) {
        this.log(error);
      }
    }, 2000);
  }

  updateTempDevices(device_id, capability, state) {
    if (temp_devices.hasOwnProperty(device_id)) {
      temp_devices[device_id][capability] = state;
    }
  }

}

module.exports = Shelly3EmDriver;
