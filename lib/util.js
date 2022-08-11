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

    this.deviceConfig = [
      {
        'hostname': ['shellyplug-'],
        'name': 'Shelly Plug',
        'gen': 'gen1',
        'type': ['SHPLG-1', 'SHPLG2-1', 'SHPLG-U1'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_power", "meter_power", "rssi"],
        'capabilities_2': [],
        'capability_options': {},
        'energy': {},
        'triggers': [],
        'callbacks': [],
        'icon': '../../../assets/icons/shellyplug.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyplug-s-'],
        'name': 'Shelly Plug S',
        'gen': 'gen1',
        'type': ['SHPLG-S'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_temperature", "rssi"],
        'capabilities_2': [],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'energy': {},
        'triggers': [],
        'callbacks': [],
        'icon': '../../../assets/icons/shellyplug-s.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyplus1-', 'ShellyPlus1-'],
        'name': 'Shelly Plus 1',
        'gen': 'gen2',
        'type': ['SNSW-001X16EU'],
        'channels': 1,
        'communication': 'websocket',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_temperature", "input_1", "rssi"],
        'capabilities_2': [],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInputExternal1On', 'triggerInputExternal1Off', 'triggerTemperature1', 'triggerTemperature2', 'triggerTemperature3'],
        'callbacks': ['single_push', 'long_push', 'double_push'],
        'icon': '../../../assets/icons/shelly-plus-1.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyplus1pm-', 'ShellyPlus1PM-'],
        'name': 'Shelly Plus 1PM',
        'gen': 'gen2',
        'type': ['SNSW-001P16EU'],
        'channels': 1,
        'communication': 'websocket',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1", "rssi"],
        'capabilities_2': [],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInputExternal1On', 'triggerInputExternal1Off', 'triggerTemperature1', 'triggerTemperature2', 'triggerTemperature3'],
        'callbacks': ['single_push', 'long_push', 'double_push'],
        'icon': '../../../assets/icons/shelly-plus-1.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyplus2pm-', 'ShellyPlus2PM-'],
        'name': 'Shelly Plus 2PM',
        'gen': 'gen2',
        'type': ['SNSW-002P16EU'],
        'channels': 2,
        'communication': 'websocket',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1", "rssi"],
        'capabilities_2': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1"],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInputExternal1On', 'triggerInputExternal1Off', 'triggerTemperature1', 'triggerTemperature2', 'triggerTemperature3'],
        'callbacks': ['single_push', 'long_push', 'double_push'],
        'icon': '../../../assets/icons/shelly-plus-1.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyplus2pm-roller-', 'ShellyPlus2PM-roller-'],
        'name': 'Shelly Plus 2PM Roller Shutter',
        'gen': 'gen2',
        'type': ['SNSW-002P16EU'],
        'channels': 1,
        'communication': 'websocket',
        'battery': false,
        'class': 'windowcoverings',
        'capabilities_1': ["windowcoverings_state", "windowcoverings_set", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1", "input_2", "rssi"],
        'capabilities_2': [],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed'],
        'callbacks': [],
        'icon': '../../../assets/icons/shelly-plus-1.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyplusht-', 'ShellyPlusHT-'],
        'name': 'Shelly Plus HT',
        'gen': 'gen2',
        'type': ['SNSN-0013A'],
        'channels': 1,
        'communication': 'websocket',
        'battery': true,
        'class': 'sensor',
        'capabilities_1': ["measure_temperature", "measure_humidity", "measure_battery", "measure_voltage", "rssi"],
        'capabilities_2': [],
        'capability_options': {},
        'energy': {"batteries": ["AA", "AA", "AA", "AA"]},
        'triggers': [],
        'callbacks': [],
        'icon': '../../../assets/icons/shelly-plus-ht.svg',
        'extra': {}
      },
      {
        'hostname': ['shellypro1-', 'ShellyPro1-'],
        'name': 'Shelly Pro 1',
        'gen': 'gen2',
        'type': ['SPSW-001XE16EU', 'SPSW-201XE16EU'],
        'channels': 1,
        'communication': 'websocket',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_temperature", "input_1", "rssi"],
        'capabilities_2': [],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
        'callbacks': ['single_push', 'long_push', 'double_push'],
        'icon': '../../../assets/icons/shelly-pro-1.svg',
        'extra': {}
      },
      {
        'hostname': ['shellypro1pm-', 'ShellyPro1PM-'],
        'name': 'Shelly Pro 1PM',
        'gen': 'gen2',
        'type': ['SPSW-001PE16EU', 'SPSW-201PE16EU'],
        'channels': 1,
        'communication': 'websocket',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1", "rssi"],
        'capabilities_2': [],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
        'callbacks': ['single_push', 'long_push', 'double_push'],
        'icon': '../../../assets/icons/shelly-pro-1.svg',
        'extra': {}
      },
      {
        'hostname': ['shellypro2-', 'ShellyPro2-'],
        'name': 'Shelly Pro 2',
        'gen': 'gen2',
        'type': ['SPSW-002XE16EU', 'SPSW-202XE16EU'],
        'channels': 2,
        'communication': 'websocket',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_temperature", "input_1", "rssi"],
        'capabilities_2': ["onoff", "measure_temperature", "input_1"],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
        'callbacks': ['single_push', 'long_push', 'double_push'],
        'icon': '../../../assets/icons/shelly-pro-1.svg',
        'extra': {}
      },
      {
        'hostname': ['shellypro2-roller-', 'ShellyPro2-roller-'],
        'name': 'Shelly Pro 2 Roller Shutter',
        'gen': 'gen2',
        'type': ['SPSW-002XE16EU', 'SPSW-202XE16EU'],
        'channels': 1,
        'communication': 'websocket',
        'battery': false,
        'class': 'windowcoverings',
        'capabilities_1': ["windowcoverings_state", "windowcoverings_set", "measure_temperature", "input_1", "input_2", "rssi"],
        'capabilities_2': [],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed'],
        'callbacks': [],
        'icon': '../../../assets/icons/shelly-pro-1.svg',
        'extra': {}
      },
      {
        'hostname': ['shellypro2pm-', 'ShellyPro2PM-'],
        'name': 'Shelly Pro 2PM',
        'gen': 'gen2',
        'type': ['SPSW-002PE16EU', 'SPSW-202PE16EU'],
        'channels': 2,
        'communication': 'websocket',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1", "rssi"],
        'capabilities_2': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1"],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
        'callbacks': ['single_push', 'long_push', 'double_push'],
        'icon': '../../../assets/icons/shelly-pro-1.svg',
        'extra': {}
      },
      {
        'hostname': ['shellypro2pm-roller-', 'ShellyPro2PM-roller-'],
        'name': 'Shelly Pro 2PM Roller Shutter',
        'gen': 'gen2',
        'type': ['SPSW-002PE16EU', 'SPSW-202PE16EU'],
        'channels': 1,
        'communication': 'websocket',
        'battery': false,
        'class': 'windowcoverings',
        'capabilities_1': ["windowcoverings_state", "windowcoverings_set", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1", "input_2", "rssi"],
        'capabilities_2': [],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed'],
        'callbacks': [],
        'icon': '../../../assets/icons/shelly-pro-1.svg',
        'extra': {}
      },
      {
        'hostname': ['shellypro3-', 'ShellyPro3-'],
        'name': 'Shelly Pro 3',
        'gen': 'gen2',
        'type': ['SPSW-003XE16EU'],
        'channels': 3,
        'communication': 'websocket',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_temperature", "input_1", "rssi"],
        'capabilities_2': ["onoff", "measure_temperature", "input_1"],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
        'callbacks': ['single_push', 'long_push', 'double_push'],
        'icon': '../../../assets/icons/shelly-pro-1.svg',
        'extra': {}
      },
      {
        'hostname': ['shellytrv-'],
        'name': 'Shelly TRV',
        'gen': 'gen1',
        'type': ['SHTRV-01'],
        'channels': 1,
        'communication': 'coap',
        'battery': true,
        'class': 'heater',
        'capabilities_1': ["target_temperature", "measure_temperature", "measure_battery", "valve_position", "valve_mode", "rssi"],
        'capabilities_2': [],
        'capability_options': {"target_temperature": {"min": 5, "max": 30}},
        'energy': {"batteries": ["INTERNAL"]},
        'triggers': ['triggerValvePosition'],
        'callbacks': [],
        'icon': '../../../assets/icons/shellytrv.svg',
        'extra': {}
      },
      {
        'hostname': ['shelly1-'],
        'name': 'Shelly 1',
        'gen': 'gen1',
        'type': ['SHSW-1'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "input_1", "rssi"],
        'capabilities_2': [],
        'capability_options': {"measure_temperature": {"title": {"en": "Device Temperature", "nl": "Apparaat temperatuur"}},"measure_temperature.1": {"title": {"en": "Temperature Sensor 1", "nl": "Temperatuursensor 1"}},"measure_temperature.2": {"title": {"en": "Temperature Sensor 2","nl": "Temperatuursensor 2"}},"measure_temperature.3": {"title": {"en": "Temperature Sensor 3", "nl": "Temperatuursensor 3"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInputExternal1On', 'triggerInputExternal1Off', 'triggerTemperature1', 'triggerTemperature2', 'triggerTemperature3'],
        'callbacks': ['shortpush', 'longpush'],
        'icon': '../../../assets/icons/shelly1.svg',
        'extra': {}
      },
      {
        'hostname': ['shelly1l-'],
        'name': 'Shelly 1L',
        'gen': 'gen1',
        'type': ['SHSW-L'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_temperature", "input_1", "input_2", "rssi"],
        'capabilities_2': [],
        'capability_options': {"measure_temperature": {"title": {"en": "Device Temperature", "nl": "Apparaat temperatuur"}},"measure_temperature.1": {"title": {"en": "Temperature Sensor 1", "nl": "Temperatuursensor 1"}},"measure_temperature.2": {"title": {"en": "Temperature Sensor 2","nl": "Temperatuursensor 2"}},"measure_temperature.3": {"title": {"en": "Temperature Sensor 3", "nl": "Temperatuursensor 3"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed', 'triggerInputExternal1On', 'triggerInputExternal1Off', 'triggerTemperature1', 'triggerTemperature2', 'triggerTemperature3'],
        'callbacks': ['shortpush_1', 'longpush_1', 'shortpush_2', 'longpush_2'],
        'icon': '../../../assets/icons/shelly1l.svg',
        'extra': {}
      },
      {
        'hostname': ['shelly1pm-'],
        'name': 'Shelly 1PM',
        'gen': 'gen1',
        'type': ['SHSW-PM'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_temperature", "input_1", "rssi"],
        'capabilities_2': [],
        'capability_options': {"measure_temperature": {"title": {"en": "Device Temperature", "nl": "Apparaat temperatuur"}},"measure_temperature.1": {"title": {"en": "Temperature Sensor 1", "nl": "Temperatuursensor 1"}},"measure_temperature.2": {"title": {"en": "Temperature Sensor 2","nl": "Temperatuursensor 2"}},"measure_temperature.3": {"title": {"en": "Temperature Sensor 3", "nl": "Temperatuursensor 3"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInputExternal1On', 'triggerInputExternal1Off', 'triggerTemperature1', 'triggerTemperature2', 'triggerTemperature3'],
        'callbacks': ['shortpush', 'longpush'],
        'icon': '../../../assets/icons/shelly1pm.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyswitch-', 'shelly2-'],
        'name': 'Shelly 2',
        'gen': 'gen1',
        'type': ['SHSW-21'],
        'channels': 2,
        'communication': 'coap',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_power", "meter_power", "input_1", "rssi"],
        'capabilities_2': ["onoff", "input_1"],
        'capability_options': {},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
        'callbacks': ['shortpush', 'longpush'],
        'icon': '../../../assets/icons/shelly2.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyswitch-roller-', 'shelly2-roller-'],
        'name': 'Shelly 2 Roller Shutter',
        'gen': 'gen1',
        'type': ['SHSW-21'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'windowcoverings',
        'capabilities_1': ["windowcoverings_state", "windowcoverings_set", "measure_power", "meter_power", "input_1", "input_2", "rssi"],
        'capabilities_2': [],
        'capability_options': {},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed'],
        'callbacks': [],
        'icon': '../../../assets/icons/shelly2.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyem3-'],
        'name': 'Shelly 3EM',
        'gen': 'gen1',
        'type': ['SHEM-3'],
        'channels': 3,
        'communication': 'coap',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_power", "meter_power_factor", "measure_current", "measure_voltage", "meter_power_returned", "meter_power", "meter_power.total", "rssi"],
        'capabilities_2': ["measure_power", "meter_power_factor", "measure_current", "measure_voltage", "meter_power_returned", "meter_power"],
        'capability_options': {"meter_power.total": {"title": {"en": "Total Power", "nl": "Totale Power"}}},
        'energy': {"cumulative": true},
        'triggers': ['triggerMeterPowerReturned', 'triggerMeterPowerFactor'],
        'callbacks': [],
        'icon': '../../../assets/icons/shelly3em.svg',
        'extra': {}
      },
      {
        'hostname': ['shelly4pro-'],
        'name': 'Shelly 4 Pro',
        'gen': 'gen1',
        'type': ['SHSW-44'],
        'channels': 4,
        'communication': 'coap',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "input_1", "rssi"],
        'capabilities_2': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "input_1"],
        'capability_options': {},
        'energy': {},
        'triggers': [],
        'callbacks': [],
        'icon': '../../../assets/icons/shelly4pro.svg',
        'extra': {}
      },
      {
        'hostname': ['shellypro4pm-', 'ShellyPro4PM-'],
        'name': 'Shelly Pro 4PM',
        'gen': 'gen2',
        'type': ['SPSW-004PE16EU', 'SPSW-104PE16EU'],
        'channels': 4,
        'communication': 'websocket',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "input_1", "measure_temperature", "rssi"],
        'capabilities_2': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "input_1"],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'energy': {},
        'triggers': [],
        'callbacks': ['single_push', 'long_push', 'double_push'],
        'icon': '../../../assets/icons/shelly4pro.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyswitch25-', 'shelly25-'],
        'name': 'Shelly 2.5',
        'gen': 'gen1',
        'type': ['SHSW-25'],
        'channels': 2,
        'communication': 'coap',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_temperature", "input_1", "rssi"],
        'capabilities_2': ["onoff", "measure_power", "meter_power", "input_1"],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
        'callbacks': ['shortpush', 'longpush'],
        'icon': '../../../assets/icons/shelly25.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyswitch25-roller-', 'shelly25-roller-'],
        'name': 'Shelly 2.5 Roller Shutter',
        'gen': 'gen1',
        'type': ['SHSW-25'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'windowcoverings',
        'capabilities_1': ["windowcoverings_state", "windowcoverings_set", "measure_power", "meter_power", "measure_temperature", "input_1", "input_2", "rssi"],
        'capabilities_2': [],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed'],
        'callbacks': [],
        'icon': '../../../assets/icons/shelly25.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyair-'],
        'name': 'Shelly Air',
        'gen': 'gen1',
        'type': ['SHAIR-1'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'sensor',
        'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_temperature", "measure_temperature.1", "measure_temperature.2", "measure_temperature.3", "measure_humidity", "input_1", "rssi"],
        'capabilities_2': [],
        'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerTemperature1', 'triggerTemperature2', 'triggerTemperature3'],
        'callbacks': [],
        'icon': '../../../assets/icons/shellyair.svg',
        'extra': {}
      },
      {
        'hostname': ['shellybulb-'],
        'name': 'Shelly Bulb',
        'gen': 'gen1',
        'type': ['SHBLB-1'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'light',
        'capabilities_1': ["onoff", "dim", "light_temperature", "light_hue", "light_saturation", "light_mode", "rssi"],
        'capabilities_2': [],
        'capability_options': {},
        'energy': {},
        'triggers': [],
        'callbacks': [],
        'icon': '../../../assets/icons/shellybulb.svg',
        'extra': {'light': {'light_endpoint': 'light', 'dim_component': 'brightness', 'light_temperature': {'min': 3000, 'max': 6500}}}
      },
      {
        'hostname': ['shellycolorbulb-'],
        'name': 'Shelly Bulb RGBW',
        'gen': 'gen1',
        'type': ['SHCB-1', 'SHCL-255'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'light',
        'capabilities_1': ["onoff", "dim", "light_temperature", "light_hue", "light_saturation", "light_mode", "rssi"],
        'capabilities_2': [],
        'capability_options': {"dim": {"opts": {"duration": true }}},
        'energy': {},
        'triggers': [],
        'callbacks': [],
        'icon': '../../../assets/icons/shellybulb.svg',
        'extra': {'light': {'light_endpoint': 'light', 'dim_component': 'brightness', 'light_temperature': {'min': 3000, 'max': 6500}}}
      },
      {
        'hostname': ['shellybutton1-', 'shellybutton2-'],
        'name': 'Shelly Button 1',
        'gen': 'gen1',
        'type': ['SHBTN-1', 'SHBTN-2'],
        'channels': 1,
        'communication': 'coap',
        'battery': true,
        'class': 'button',
        'capabilities_1': ["measure_battery", "rssi"],
        'capabilities_2': [],
        'capability_options': {},
        'energy': {"batteries": ["INTERNAL"]},
        'triggers': [],
        'callbacks': ['shortpush', 'double_shortpush', 'triple_shortpush', 'longpush'],
        'icon': '../../../assets/icons/shellybutton1.svg',
        'extra': {}
      },
      {
        'hostname': ['shellydimmer-', 'shellydimmer2-'],
        'name': 'Shelly Dimmer',
        'gen': 'gen1',
        'type': ['SHDM-1', 'SHDM-2'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'light',
        'capabilities_1': ["onoff", "dim", "measure_power", "meter_power", "measure_temperature", "input_1", "input_2", "rssi"],
        'capabilities_2': [],
        'capability_options': {"dim": {"opts": {"duration": true }}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed'],
        'callbacks': ['shortpush_1', 'longpush_1', 'shortpush_2', 'longpush_2'],
        'icon': '../../../assets/icons/shellydimmer.svg',
        'extra': {'light': {'light_endpoint': 'light', 'dim_component': 'brightness'}}
      },
      {
        'hostname': ['ShellyBulbDuo-'],
        'name': 'Shelly Duo',
        'gen': 'gen1',
        'type': ['SHBDUO-1'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'light',
        'capabilities_1': ["onoff", "dim", "light_temperature", "measure_power", "meter_power", "rssi"],
        'capabilities_2': [],
        'capability_options': {"dim": {"opts": {"duration": true }}},
        'energy': {},
        'triggers': [],
        'callbacks': [],
        'icon': '../../../assets/icons/shellybulb.svg',
        'extra': {'light': {'light_endpoint': 'light', 'dim_component': 'brightness', 'light_temperature': {'min': 3000, 'max': 6500}}}
      },
      {
        'hostname': ['shellydw-', 'shellydw2-'],
        'name': 'Shelly DW',
        'gen': 'gen1',
        'type': ['SHDW-1', 'SHDW-2'],
        'channels': 1,
        'communication': 'coap',
        'battery': true,
        'class': 'sensor',
        'capabilities_1': ["alarm_contact", "measure_luminance", "measure_battery", "measure_temperature", "alarm_tamper", "tilt", "rssi"],
        'capabilities_2': [],
        'capability_options': {},
        'energy': {"batteries": ["CR123A", "CR123A"]},
        'triggers': ['triggerTilt'],
        'callbacks': [],
        'icon': '../../../assets/icons/shellydw.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyem-'],
        'name': 'Shelly EM',
        'gen': 'gen1',
        'type': ['SHEM'],
        'channels': 2,
        'communication': 'coap',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_power", "measure_voltage", "meter_power", "meter_power_returned", "rssi"],
        'capabilities_2': ["onoff", "measure_power", "measure_voltage", "meter_power", "meter_power_returned"],
        'capability_options': {},
        'energy': {"cumulative": true},
        'triggers': ['triggerMeterPowerReturned'],
        'callbacks': [],
        'icon': '../../../assets/icons/shellyem.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyflood-'],
        'name': 'Shelly Flood',
        'gen': 'gen1',
        'type': ['SHWT-1'],
        'channels': 1,
        'communication': 'coap',
        'battery': true,
        'class': 'sensor',
        'capabilities_1': ["alarm_water", "measure_temperature", "measure_battery", "rssi"],
        'capabilities_2': [],
        'capability_options': {},
        'energy': {"batteries": ["CR123A"]},
        'triggers': [],
        'callbacks': [],
        'icon': '../../../assets/icons/shellyflood.svg',
        'extra': {}
      },
      {
        'hostname': ['shellygas-'],
        'name': 'Shelly Gas',
        'gen': 'gen1',
        'type': ['SHGS-1'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'sensor',
        'capabilities_1': ["alarm_smoke", "gas_concentration", "rssi"],
        'capabilities_2': [],
        'capability_options': {},
        'energy': {},
        'triggers': ['triggerGasConcentration'],
        'callbacks': [],
        'icon': '../../../assets/icons/shellygas.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyht-'],
        'name': 'Shelly HT',
        'gen': 'gen1',
        'type': ['SHHT-1'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'sensor',
        'capabilities_1': ["measure_humidity", "measure_temperature", "measure_battery", "rssi"],
        'capabilities_2': [],
        'capability_options': {},
        'energy': {"batteries": ["CR123A"]},
        'triggers': [],
        'callbacks': [],
        'icon': '../../../assets/icons/shellyht.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyi3-', 'shellyix3-'],
        'name': 'Shelly i3',
        'gen': 'gen1',
        'type': ['SHIX3-1'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'other',
        'capabilities_1': ["input_1", "input_2", "input_3", "rssi"],
        'capabilities_2': [],
        'capability_options': {},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed', 'triggerInput3On', 'triggerInput3Off', 'triggerInput3Changed'],
        'callbacks': ['shortpush_1', 'longpush_1', 'double_shortpush_1', 'triple_shortpush_1', 'shortpush_longpush_1', 'longpush_shortpush_1', 'shortpush_2', 'longpush_2', 'double_shortpush_2', 'triple_shortpush_2', 'shortpush_longpush_2', 'longpush_shortpush_2', 'shortpush_3', 'longpush_3', 'double_shortpush_3', 'triple_shortpush_3', 'shortpush_longpush_3', 'longpush_shortpush_3'],
        'icon': '../../../assets/icons/shellyi3.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyplusi4-', 'ShellyPlusI4-'],
        'name': 'Shelly Plus i4',
        'gen': 'gen2',
        'type': ['SNSN-0024X', 'SNSN-0D24X'],
        'channels': 1,
        'communication': 'websocket',
        'battery': false,
        'class': 'other',
        'capabilities_1': ["input_1", "input_2", "input_3", "input_4", "rssi"],
        'capabilities_2': [],
        'capability_options': {},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed', 'triggerInput3On', 'triggerInput3Off', 'triggerInput3Changed', 'triggerInput4On', 'triggerInput4Off', 'triggerInput4Changed'],
        'callbacks': ['single_push_1', 'long_push_1', 'double_push_1', 'single_push_2', 'long_push_2', 'double_push_2', 'single_push_3', 'long_push_3', 'double_push_3', 'single_push_4', 'long_push_4', 'double_push_4'],
        'icon': '../../../assets/icons/shellyi4.svg',
        'extra': {}
      },
      {
        'hostname': ['shellymotionsensor-'],
        'name': 'Shelly Motion',
        'gen': 'gen1',
        'type': ['SHMOS-01'],
        'channels': 1,
        'communication': 'coap',
        'battery': true,
        'class': 'sensor',
        'capabilities_1': ["alarm_motion", "measure_luminance", "measure_battery", "alarm_tamper", "rssi"],
        'capabilities_2': [],
        'capability_options': {},
        'energy': {"batteries": ["INTERNAL"]},
        'triggers': [],
        'callbacks': [],
        'icon': '../../../assets/icons/shellymotion.svg',
        'extra': {}
      },
      {
        'hostname': ['shellymotion2-'],
        'name': 'Shelly Motion 2',
        'gen': 'gen1',
        'type': ['SHMOS-02'],
        'channels': 1,
        'communication': 'coap',
        'battery': true,
        'class': 'sensor',
        'capabilities_1': ["alarm_motion", "measure_luminance", "measure_temperature", "measure_battery", "alarm_tamper", "rssi"],
        'capabilities_2': [],
        'capability_options': {},
        'energy': {"batteries": ["INTERNAL"]},
        'triggers': [],
        'callbacks': [],
        'icon': '../../../assets/icons/shellymotion.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyrgbw2-'],
        'name': 'Shelly RGBW2 Color',
        'gen': 'gen1',
        'type': ['SHRGBW2'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'light',
        'capabilities_1': ["onoff", "dim", "light_temperature", "light_hue", "light_saturation", "measure_power", "meter_power", "light_mode", "onoff.whitemode", "input_1", "rssi"],
        'capabilities_2': [],
        'capability_options': {"dim": {"opts": {"duration": true}}, "light_temperature": {"title": {"en": "Dimlevel white","nl": "Dim niveau wit"}}, "onoff.whitemode": {"title": {"en": "Toggle white mode","nl": "Wit modus schakelen"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
        'callbacks': ['longpush', 'shortpush'],
        'icon': '../../../assets/icons/shellyrgbw2.svg',
        'extra': {'light': {'light_endpoint': 'color', 'dim_component': 'gain', 'light_temperature': {'min': 0, 'max': 255}}}
      },
      {
        'hostname': ['shellyrgbw2-white-'],
        'name': 'Shelly RGBW2 White',
        'gen': 'gen1',
        'type': ['SHRGBW2'],
        'channels': 4,
        'communication': 'coap',
        'battery': false,
        'class': 'light',
        'capabilities_1': ["onoff", "dim", "measure_power", "measure_power.total", "meter_power", "input_1", "rssi"],
        'capabilities_2': ["onoff", "dim", "measure_power", "meter_power", "input_1"],
        'capability_options': {"dim": {"opts": {"duration": true}}, "measure_power.total": {"title": {"en": "Total Power", "nl": "Totaal vermogen"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
        'callbacks': [],
        'icon': '../../../assets/icons/shellyrgbw2.svg',
        'extra': {'light': {'light_endpoint': 'white', 'dim_component': 'brightness'}}
      },
      {
        'hostname': ['shellysmoke-'],
        'name': 'Shelly Smoke',
        'gen': 'gen1',
        'type': ['SHSM-01', 'SHSM-02'],
        'channels': 1,
        'communication': 'coap',
        'battery': true,
        'class': 'sensor',
        'capabilities_1': ["alarm_smoke", "measure_temperature", "measure_battery", "rssi"],
        'capabilities_2': [],
        'capability_options': {},
        'energy': {"batteries": ["AA"]},
        'triggers': [],
        'callbacks': [],
        'icon': '../../../assets/icons/shellysmoke.svg',
        'extra': {}
      },
      {
        'hostname': ['shellyuni-'],
        'name': 'Shelly Uni',
        'gen': 'gen1',
        'type': ['SHUNI-1'],
        'channels': 2,
        'communication': 'coap',
        'battery': false,
        'class': 'socket',
        'capabilities_1': ["onoff", "measure_voltage", "input_1", "rssi"],
        'capabilities_2': ["onoff", "measure_voltage", "input_1"],
        'capability_options': {"measure_temperature.1": {"title": {"en": "Temperature Sensor 1","nl": "Temperatuursensor 1"}}, "measure_temperature.2": {"title": {"en": "Temperature Sensor 2","nl": "Temperatuursensor 2"}}, "measure_temperature.3": {"title": {"en": "Temperature Sensor 3","nl": "Temperatuursensor 3"}}, "measure_voltage": {"title": {"en": "ADC Voltage","nl": "ADC Voltage"}}},
        'energy': {},
        'triggers': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerTemperature1', 'triggerTemperature2', 'triggerInput2Changed', 'triggerTemperature3'],
        'callbacks': ['shortpush', 'longpush'],
        'icon': '../../../assets/icons/shellyuni.svg',
        'extra': {}
      },
      {
        'hostname': ['ShellyVintage-'],
        'name': 'Shelly Vintage',
        'gen': 'gen1',
        'type': ['SHVIN-1'],
        'channels': 1,
        'communication': 'coap',
        'battery': false,
        'class': 'light',
        'capabilities_1': ["onoff", "dim", "measure_power", "meter_power", "rssi"],
        'capabilities_2': [],
        'capability_options': {"dim": {"opts": {"duration": true}}},
        'energy': {},
        'triggers': [],
        'callbacks': [],
        'icon': '../../../assets/icons/shellyrgbw2.svg',
        'extra': {'light': {'light_endpoint': 'light', 'dim_component': 'brightness'}}
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
      return reject(error);
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
            try {
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
            } catch(error) {
              console.log(error);
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
      return reject(error);
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
            const callbacks = device.getStoreValue('config').callbacks;
            if (callbacks.length > 0) {
              let manifest = driver.manifest;
              let tempActions = allActions;
              allActions = tempActions.concat(callbacks.filter((item) => tempActions.indexOf(item) < 0));
              shellies.push(
                {
                  id: device.getData().id,
                  name: device.getName(),
                  icon: manifest.icon,
                  actions: callbacks
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
      console.log(error);
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
        console.log(error);
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

  getDeviceConfig(hostname, type = null) {
    if (type === null) {
      return this.deviceConfig.find(r => r.hostname.includes(hostname));
    } else {
      return this.deviceConfig.find(r => r.type.includes(type));
    }
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

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
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