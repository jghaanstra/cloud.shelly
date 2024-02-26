'use strict';

const Homey = require('homey');
const Device = require('./device.js');
const Util = require('../lib/util.js');

class ShellyBluetoothDevice extends Device {

  async onInit() {
    try {
      if (!this.util) this.util = new Util({homey: this.homey});

      // DEVICE VARIABLES
      this.uint8 = 0;
      this.int8 = 1;
      this.uint16 = 2;
      this.int16 = 3;
      this.uint24 = 4;
      this.int24 = 5;

      this.BTH = [];
      this.BTH[0x00] = { n: 'pid', t: this.uint8 };
      this.BTH[0x01] = { n: 'measure_battery', t: this.uint8, u: '%' };
      this.BTH[0x05] = { n: 'measure_luminance', t: this.uint24, f: 0.01 };
      this.BTH[0x1a] = { n: 'alarm_contact_door', t: this.uint8 };
      this.BTH[0x03] = { n: 'measure_humidity', t: this.uint16, f: 0.01, u: "%" };
      this.BTH[0x02] = { n: 'measure_temperature', t: this.int16, f: 0.01, u: "tC" };
      this.BTH[0x2d] = { n: 'alarm_contact_window', t: this.uint8 };
      this.BTH[0x3a] = { n: 'button', t: this.uint8 };
      this.BTH[0x3f] = { n: 'tilt', t: this.int16, f: 0.1 };
      this.BTH[0x21] = { n: 'alarm_motion', t: this.uint8 };

      this.BTHomeDecoder = {
        utoi: (num, bitsz) => {
          let mask = 1 << (bitsz - 1);
          return num & mask ? num - (1 << bitsz) : num;
        },
        getUInt8: (buffer) => {
          return buffer.at(0);
        },
        getInt8: (buffer) => {
          return this.BTHomeDecoder.utoi(this.BTHomeDecoder.getUInt8(buffer), 8);
        },
        getUInt16LE: (buffer) => {
          return 0xffff & ((buffer.at(1) << 8) | buffer.at(0));
        },
        getInt16LE: (buffer) => {
          return this.BTHomeDecoder.utoi(this.BTHomeDecoder.getUInt16LE(buffer), 16);
        },
        getUInt24LE: (buffer) => {
          return (
            0x00ffffff & ((buffer.at(2) << 16) | (buffer.at(1) << 8) | buffer.at(0))
          );
        },
        getInt24LE: (buffer) => {
          return this.BTHomeDecoder.utoi(this.BTHomeDecoder.getUInt24LE(buffer), 24);
        },
        getBufValue: (type, buffer) => {
          if (buffer.length < this.getByteSize(type)) return null;
          let res = null;
          if (type === this.uint8) res = this.BTHomeDecoder.getUInt8(buffer);
          if (type === this.int8) res = this.BTHomeDecoder.getInt8(buffer);
          if (type === this.uint16) res = this.BTHomeDecoder.getUInt16LE(buffer);
          if (type === this.int16) res = this.BTHomeDecoder.getInt16LE(buffer);
          if (type === this.uint24) res = this.BTHomeDecoder.getUInt24LE(buffer);
          if (type === this.int24) res = this.BTHomeDecoder.getInt24LE(buffer);
          return res;
        },
        unpack: (buffer) => {
          if (typeof buffer === 'string' || buffer.length === 0) return null;
          let result = {};
          let _dib = buffer.at(0);
          result['encryption'] = _dib & 0x1 ? true : false;
          result['bthome_version'] = _dib >> 5;
          if (result['bthome_version'] !== 2) return null;
          if (result['encryption']) return result;
          buffer = buffer.slice(1);
      
          let _bth;
          let _value;
          while (buffer.length > 0) {
            _bth = this.BTH[buffer.at(0)];
            if (typeof _bth === 'undefined') {
              this.error('BTH: unknown type');
              break;
            }
            buffer = buffer.slice(1);
            _value = this.BTHomeDecoder.getBufValue(_bth.t, buffer);
            if (_value === null) break;
            if (typeof _bth.f !== 'undefined') _value = _value * _bth.f;
            result[_bth.n] = _value;
            buffer = buffer.slice(this.getByteSize(_bth.t));
          }
          return result;
        },
      }

      // REGISTERING DEVICE TRIGGER CARDS AND INITIALLY SET BEACON AS OFFLINE
      this.homey.setTimeout(async () => {
        try {

          /* update device config */
          await this.updateDeviceConfig();

          /* register device trigger cards */
          let triggers = [];
          if (this.getStoreValue('config').triggers !== undefined) {
            triggers = this.getStoreValue('config').triggers
          } else if (this.getStoreValue('channel') !== 0) {
            triggers = this.getStoreValue('config').triggers_2
          } else {
            triggers = this.getStoreValue('config').triggers_1
          }
          for (const trigger of triggers) {
            this.homey.flow.getDeviceTriggerCard(trigger);
          }

          /* set beacon offline */
          await this.getCapabilityValue('beacon', false);

        } catch (error) {
          this.log(error);
        }
      }, 2000);

    } catch (error) {
      this.error(error);
    }
  }

  async onAdded() {
    try {
      await this.homey.app.bluetoothListener();
      return await this.homey.app.updateShellyCollection();
    } catch (error) {
      this.error(error);
    }
  }

  async onDeleted() {
    try {
      await this.homey.clearTimeout(this.timeOutBeacon);
      await this.homey.app.bluetoothListenerClose();
      if (this.getStoreValue('channel') === 0) {
        const iconpath = "/userdata/" + this.getData().id +".svg";
        await this.util.removeIcon(iconpath);
      }
      return await this.homey.app.updateShellyCollection();
    } catch (error) {
      this.error(error);
    }
  }

  async onUninit() {
    try {
      await this.homey.clearTimeout(this.timeOutBeacon);
      return await this.homey.app.updateShellyCollection();
    } catch (error) {
      this.error(error);
    }
  }

  /* generic full status parser for BLU advertisements send over BLE Proxy websocket messages */
  async parseBluetoothEvents(result = {}) {
    try {

      if (this.getStoreValue('ble_pid') === null || this.getStoreValue('ble_pid') < result.pid || (result.pid < 10 && this.getStoreValue('ble_pid') > 240) || (this.getStoreValue('ble_pid') - result.pid >= 10)) {
        if (!this.getAvailable()) { await this.setAvailable(); }
        let channel = this.getStoreValue('channel') || 0;

        // update the PID to avoid processing double advertisements
        await this.setStoreValue('ble_pid', result.pid);

        /* measure_battery */
        if (result.hasOwnProperty("measure_battery")) {
          this.updateCapabilityValue('measure_battery', result.measure_battery, channel);
        }

        /* measure_lux */
        if (result.hasOwnProperty("measure_luminance")) {
          this.updateCapabilityValue('measure_luminance', result.measure_luminance, channel);
        }

        /* alarm_motion */
        if (result.hasOwnProperty("alarm_motion")) {
          this.updateCapabilityValue('alarm_motion', result.alarm_motion === 1 ? true : false, channel);
        }

        /* alarm_contact */
        if (result.hasOwnProperty("alarm_contact_door")) {
          this.updateCapabilityValue('alarm_contact', result.alarm_contact_door === 1 ? true : false, channel);
        }
        if (result.hasOwnProperty("alarm_contact_window")) {
          this.updateCapabilityValue('alarm_contact', result.alarm_contact_window === 1 ? true : false, channel);
        }

        /* measure_temperature */
        if (result.hasOwnProperty("measure_temperature")) {
          this.updateCapabilityValue('measure_temperature', result.measure_temperature, channel);
        }

        /* measure_humidity */
        if (result.hasOwnProperty("measure_humidity")) {
          this.updateCapabilityValue('measure_humidity', result.measure_humidity, channel);
        }

        /* tilt */
        if (result.hasOwnProperty("tilt")) {
          if (this.getCapabilityValue('tilt') !== result.tilt) {
            await this.homey.flow.getDeviceTriggerCard('triggerTilt').trigger(this, {'tilt': result.tilt}, {}).catch(error => { this.error(error) });
            this.updateCapabilityValue('tilt', result.tilt, channel);
          }
        }

        /* button */
        if (result.hasOwnProperty("button")) {
          if (result.button !== 0) {
            const action_event = this.util.getActionEventDescription(result.button.toString(), 'bluetooth', 'gen2');

            this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action_event}, {"action": action_event}).catch(error => { this.error(error) });

            // TODO: remove this eventually
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action_event}, {"id": this.getData().id, "device": this.getName(), "action": action_event}).catch(error => { this.error(error) });
          }
        }

        /* rssi */
        if (result.hasOwnProperty("rssi")) {
          if (result.rssi !== null) {
            this.updateCapabilityValue('rssi', result.rssi, channel);
          }
        }

        /* beacon */
        if (this.hasCapability('beacon')) {
          await this.homey.clearTimeout(this.timeOutBeacon);
          this.timeOutBeacon = this.homey.setTimeout(async () => {
            try {
              if (this.getCapabilityValue('beacon')) {
                await this.triggerDeviceTriggerCard('beacon', false, channel, 'triggerBeaconOutRange', {}, {});
                await this.triggerDeviceTriggerCard('beacon', false, channel, 'triggerBeaconChanged', {"status": false}, {"status": false});
                await this.updateCapabilityValue('beacon', false, channel);
              }
            } catch (error) {
              this.error(error);
            }
          }, this.getSetting('beacon_timeout') * 60 * 1000);

          if (!this.getCapabilityValue('beacon')) {
            await this.triggerDeviceTriggerCard('beacon', true, channel, 'triggerBeaconInRange', {}, {});
            await this.triggerDeviceTriggerCard('beacon', true, channel, 'triggerBeaconChanged', {"status": true}, {"status": true});
            await this.updateCapabilityValue('beacon', true, channel);
          }
        }
        

      }
    } catch (error) {
      this.error(error);
    }
  }

  async parseBluetoothAdvertisement(advertisement) {
    try {
      if (advertisement.serviceData !== null) {
        advertisement.serviceData.forEach((element) => {
          const result = this.BTHomeDecoder.unpack(element.data);
          result.rssi = advertisement.rssi;
          this.parseBluetoothEvents(result);
        });
      }
    } catch (error) {
      this.error(error);
    }
    
  }

  getByteSize(type) {
    if (type === this.uint8 || type === this.int8) return 1;
    if (type === this.uint16 || type === this.int16) return 2;
    if (type === this.uint24 || type === this.int24) return 3;
    return 255;
  }

}

ShellyBluetoothDevice.prototype.updateCapabilityValue = Device.prototype.updateCapabilityValue;
ShellyBluetoothDevice.prototype.triggerDeviceTriggerCard = Device.prototype.triggerDeviceTriggerCard;
ShellyBluetoothDevice.prototype.updateDeviceConfig = Device.prototype.updateDeviceConfig;

module.exports = ShellyBluetoothDevice;