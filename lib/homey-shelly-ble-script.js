/**
 * Homey BLE Proxy Script
 * This script listens to BLE advertisements of Shelly BLU devices
 * and forwards them to Homey over websocket
 */

// SUPPORTED DEVICES
let supported_device = ['SBBT-002C', 'SBDW-002C'];

let BTHOME_SVC_ID_STR = 'fcd2';
let SCAN_DURATION = BLE.Scanner.INFINITE_SCAN;

let uint8 = 0;
let int8 = 1;
let uint16 = 2;
let int16 = 3;
let uint24 = 4;
let int24 = 5;

function getByteSize(type) {
  if (type === uint8 || type === int8) return 1;
  if (type === uint16 || type === int16) return 2;
  if (type === uint24 || type === int24) return 3;
  return 255;
}

let BTH = [];
BTH[0x00] = { n: 'pid', t: uint8 };
BTH[0x01] = { n: 'measure_battery', t: uint8, u: '%' };
BTH[0x05] = { n: 'measure_luminance', t: uint24, f: 0.01 };
BTH[0x1a] = { n: 'alarm_contact_door', t: uint8 };
BTH[0x20] = { n: 'measure_humidity', t: uint8 };
BTH[0x2d] = { n: 'alarm_contact_window', t: uint8 };
BTH[0x3a] = { n: 'button', t: uint8 };
BTH[0x3f] = { n: 'tilt', t: int16, f: 0.1 };

let BTHomeDecoder = {
  utoi: function (num, bitsz) {
    let mask = 1 << (bitsz - 1);
    return num & mask ? num - (1 << bitsz) : num;
  },
  getUInt8: function (buffer) {
    return buffer.at(0);
  },
  getInt8: function (buffer) {
    return this.utoi(this.getUInt8(buffer), 8);
  },
  getUInt16LE: function (buffer) {
    return 0xffff & ((buffer.at(1) << 8) | buffer.at(0));
  },
  getInt16LE: function (buffer) {
    return this.utoi(this.getUInt16LE(buffer), 16);
  },
  getUInt24LE: function (buffer) {
    return (
      0x00ffffff & ((buffer.at(2) << 16) | (buffer.at(1) << 8) | buffer.at(0))
    );
  },
  getInt24LE: function (buffer) {
    return this.utoi(this.getUInt24LE(buffer), 24);
  },
  getBufValue: function (type, buffer) {
    if (buffer.length < getByteSize(type)) return null;
    let res = null;
    if (type === uint8) res = this.getUInt8(buffer);
    if (type === int8) res = this.getInt8(buffer);
    if (type === uint16) res = this.getUInt16LE(buffer);
    if (type === int16) res = this.getInt16LE(buffer);
    if (type === uint24) res = this.getUInt24LE(buffer);
    if (type === int24) res = this.getInt24LE(buffer);
    return res;
  },
  unpack: function (buffer) {
    if (typeof buffer !== 'string' || buffer.length === 0) return null;
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
      _bth = BTH[buffer.at(0)];
      if (typeof _bth === 'undefined') {
        console.log('BTH: unknown type');
        break;
      }
      buffer = buffer.slice(1);
      _value = this.getBufValue(_bth.t, buffer);
      if (_value === null) break;
      if (typeof _bth.f !== 'undefined') _value = _value * _bth.f;
      result[_bth.n] = _value;
      buffer = buffer.slice(getByteSize(_bth.t));
    }
    return result;
  },
};

let ShellyBLUParser = {
  getData: function (res) {
    let result = BTHomeDecoder.unpack(res.service_data[BTHOME_SVC_ID_STR]);
    result.model = res.local_name;
    result.addr = res.addr;
    result.rssi = res.rssi;
    return result;
  },
};

// PARSE RECEIVED ADVERTISEMENTS
let last_packet_id = 0x100;
function parseResult(ev, res) {

  if (ev !== BLE.Scanner.SCAN_RESULT) return;
  if (typeof res.service_data === 'undefined' || typeof res.service_data[BTHOME_SVC_ID_STR] === 'undefined') return;
  if (typeof res.addr === 'undefined' || typeof res.local_name === 'undefined' || typeof res.local_name !== 'string') return;
  if (supported_device.indexOf(res.local_name) === -1) return;

  let BTHparsed = ShellyBLUParser.getData(res);

  if (BTHparsed === null) {
    console.log('Failed to parse BTH data');
    return;
  }

  if (last_packet_id === BTHparsed.pid) return;
  last_packet_id = BTHparsed.pid;

  Shelly.emitEvent('NotifyBluetoothStatus', BTHparsed);
}

// START BLE SCAN
function startBLEScan() {
  let bleScanSuccess = BLE.Scanner.Start({ duration_ms: SCAN_DURATION, active: true }, parseResult);
  if( bleScanSuccess === false ) {
    Timer.set(1000, false, startBLEScan);
  } else {
    console.log('Success: Homey Bluetooth Proxy running');
  }
}

// CHECK IF BLE IS ENABLED AND START SCAN
let BLEConfig = Shelly.getComponentConfig('ble');
if(BLEConfig.enable === false) {
  console.log('Error: BLE not enabled');
} else {
  Timer.set(1000, false, startBLEScan);
}