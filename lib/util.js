'use strict';

const axios = require('axios');
const fs = require('fs');
const Auth = require('http-auth-client');
const crypto = require('crypto');

class Util {

  static deviceConfig = [
    {
      'hostname': ['shellyplug-'],
      'name': 'Shelly Plug',
      'gen': 'gen1',
      'type': ['SHPLG-1', 'SHPLG2-1', 'SHPLG-U1'],
      'channels': 1,
      'communication': 'coap',
      'battery': false,
      'class': 'socket',
      'capabilities_1': ["onoff", "measure_power", "meter_power", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {},
      'energy': {},
      'triggers_1': [],
      'triggers_2': [],
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
      'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_temperature", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
      'energy': {},
      'triggers_1': [],
      'triggers_2': [],
      'callbacks': [],
      'icon': '../../../assets/icons/shellyplug-s.svg',
      'extra': {}
    },
    {
      'hostname': ['shellyplus1-', 'ShellyPlus1-'],
      'name': 'Shelly Plus 1',
      'gen': 'gen2',
      'type': ['SNSW-001X16EU', 'SNSW-001X15UL'],
      'channels': 1,
      'communication': 'websocket',
      'battery': false,
      'class': 'socket',
      'capabilities_1': ["onoff", "measure_temperature", "input_1", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': [],
      'capability_options': {
        "measure_temperature": {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},
        "measure_temperature.1": {"title": {"en": "Temperature Sensor 1", "nl": "Temperatuursensor 1"}},
        "measure_temperature.2": {"title": {"en": "Temperature Sensor 2","nl": "Temperatuursensor 2"}},
        "measure_temperature.3": {"title": {"en": "Temperature Sensor 3", "nl": "Temperatuursensor 3"}},
        "measure_temperature.4": {"title": {"en": "Temperature Sensor 4", "nl": "Temperatuursensor 4"}},
        "measure_temperature.5": {"title": {"en": "Temperature Sensor 5", "nl": "Temperatuursensor 5"}},
        "measure_voltage.1": {"title": {"en": "Voltagemeter 1", "nl": "Voltagemeter 1"}},
        "measure_voltage.2": {"title": {"en": "Voltagemeter 2", "nl": "Voltagemeter 2"}},
        "measure_voltage.3": {"title": {"en": "Voltagemeter 3", "nl": "Voltagemeter 3"}},
        "measure_voltage.4": {"title": {"en": "Voltagemeter 4", "nl": "Voltagemeter 4"}},
        "measure_voltage.5": {"title": {"en": "Voltagemeter 5", "nl": "Voltagemeter 5"}},
        "measure_humidity.1": {"title": {"en": "Humidity Sensor 1", "nl": "Vochtsensor 1"}},
        "measure_humidity.2": {"title": {"en": "Humidity Sensor 2","nl": "Vochtsensor 2"}},
        "measure_humidity.3": {"title": {"en": "Humidity Sensor 3", "nl": "Vochtsensor 3"}},
        "measure_humidity.4": {"title": {"en": "Humidity Sensor 4", "nl": "Vochtsensor 4"}},
        "measure_humidity.5": {"title": {"en": "Humidity Sensor 5", "nl": "Vochtsensor 5"}},
        "measure_humidity.5": {"title": {"en": "Humidity Sensor 5", "nl": "Vochtsensor 5"}},
        "measure_humidity.5": {"title": {"en": "Humidity Sensor 5", "nl": "Vochtsensor 5"}},
        "button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},
        "button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}
      },
      'energy': {},
      'triggers_1': [
        'triggerInput1On',
        'triggerInput1Off',
        'triggerInput1Changed',
        'triggerTemperature1',
        'triggerTemperature2',
        'triggerTemperature3',
        'triggerTemperature4',
        'triggerTemperature5',
        'triggerHumidity1',
        'triggerHumidity2',
        'triggerHumidity3',
        'triggerHumidity4',
        'triggerHumidity5',
        'triggerVoltmeter1',
        'triggerVoltmeter2',
        'triggerVoltmeter3',
        'triggerVoltmeter4',
        'triggerVoltmeter5',
        'triggerPlusInputExternal1On',
        'triggerPlusInputExternal1Off',
        'triggerPlusInputExternal1Changed',
        'triggerPlusInputExternal2On',
        'triggerPlusInputExternal2Off',
        'triggerPlusInputExternal2Changed',
        'triggerPlusInputExternal3On',
        'triggerPlusInputExternal3Off',
        'triggerPlusInputExternal3Changed'
      ],
      'triggers_2': [],
      'callbacks': ['single_push', 'long_push', 'double_push', 'triple_push'],
      'icon': '../../../assets/icons/shelly-plus-1.svg',
      'extra': {}
    },
    {
      'hostname': ['shellyplus1pm-', 'ShellyPlus1PM-'],
      'name': 'Shelly Plus 1PM',
      'gen': 'gen2',
      'type': ['SNSW-001P16EU', 'SNSW-001P15UL'],
      'channels': 1,
      'communication': 'websocket',
      'battery': false,
      'class': 'socket',
      'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': [],
      'capability_options': {
        "measure_temperature": {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},
        "measure_temperature.1": {"title": {"en": "Temperature Sensor 1", "nl": "Temperatuursensor 1"}},
        "measure_temperature.2": {"title": {"en": "Temperature Sensor 2","nl": "Temperatuursensor 2"}},
        "measure_temperature.3": {"title": {"en": "Temperature Sensor 3", "nl": "Temperatuursensor 3"}},
        "measure_temperature.4": {"title": {"en": "Temperature Sensor 4", "nl": "Temperatuursensor 4"}},
        "measure_temperature.5": {"title": {"en": "Temperature Sensor 5", "nl": "Temperatuursensor 5"}},
        "measure_voltage.1": {"title": {"en": "Voltagemeter 1", "nl": "Voltagemeter 1"}},
        "measure_voltage.2": {"title": {"en": "Voltagemeter 2", "nl": "Voltagemeter 2"}},
        "measure_voltage.3": {"title": {"en": "Voltagemeter 3", "nl": "Voltagemeter 3"}},
        "measure_voltage.4": {"title": {"en": "Voltagemeter 4", "nl": "Voltagemeter 4"}},
        "measure_voltage.5": {"title": {"en": "Voltagemeter 5", "nl": "Voltagemeter 5"}},
        "measure_humidity.1": {"title": {"en": "Humidity Sensor 1", "nl": "Vochtsensor 1"}},
        "measure_humidity.2": {"title": {"en": "Humidity Sensor 2","nl": "Vochtsensor 2"}},
        "measure_humidity.3": {"title": {"en": "Humidity Sensor 3", "nl": "Vochtsensor 3"}},
        "measure_humidity.4": {"title": {"en": "Humidity Sensor 4", "nl": "Vochtsensor 4"}},
        "measure_humidity.5": {"title": {"en": "Humidity Sensor 5", "nl": "Vochtsensor 5"}},
        "measure_humidity.5": {"title": {"en": "Humidity Sensor 5", "nl": "Vochtsensor 5"}},
        "measure_humidity.5": {"title": {"en": "Humidity Sensor 5", "nl": "Vochtsensor 5"}},
        "button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},
        "button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}
      },
      'energy': {},
      'triggers_1': [
        'triggerInput1On',
        'triggerInput1Off',
        'triggerInput1Changed',
        'triggerTemperature1',
        'triggerTemperature2',
        'triggerTemperature3',
        'triggerTemperature4',
        'triggerTemperature5',
        'triggerHumidity1',
        'triggerHumidity2',
        'triggerHumidity3',
        'triggerHumidity4',
        'triggerHumidity5',
        'triggerVoltmeter1',
        'triggerVoltmeter2',
        'triggerVoltmeter3',
        'triggerVoltmeter4',
        'triggerVoltmeter5',
        'triggerPlusInputExternal1On',
        'triggerPlusInputExternal1Off',
        'triggerPlusInputExternal1Changed',
        'triggerPlusInputExternal2On',
        'triggerPlusInputExternal2Off',
        'triggerPlusInputExternal2Changed',
        'triggerPlusInputExternal3On',
        'triggerPlusInputExternal3Off',
        'triggerPlusInputExternal3Changed'
      ],
      'triggers_2': [],
      'callbacks': ['single_push', 'long_push', 'double_push', 'triple_push'],
      'icon': '../../../assets/icons/shelly-plus-1.svg',
      'extra': {}
    },
    {
      'hostname': ['shellyplus2pm-', 'ShellyPlus2PM-'],
      'name': 'Shelly Plus 2PM',
      'gen': 'gen2',
      'type': ['SNSW-002P16EU', 'SNSW-102P16EU'],
      'channels': 2,
      'communication': 'websocket',
      'battery': false,
      'class': 'socket',
      'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1"],
      'capability_options': {
        'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},
        "measure_temperature.1": {"title": {"en": "Temperature Sensor 1", "nl": "Temperatuursensor 1"}},
        "measure_temperature.2": {"title": {"en": "Temperature Sensor 2","nl": "Temperatuursensor 2"}},
        "measure_temperature.3": {"title": {"en": "Temperature Sensor 3", "nl": "Temperatuursensor 3"}},
        "measure_temperature.4": {"title": {"en": "Temperature Sensor 4", "nl": "Temperatuursensor 4"}},
        "measure_temperature.5": {"title": {"en": "Temperature Sensor 5", "nl": "Temperatuursensor 5"}},
        "measure_voltage.1": {"title": {"en": "Voltagemeter 1", "nl": "Voltagemeter 1"}},
        "measure_voltage.2": {"title": {"en": "Voltagemeter 2", "nl": "Voltagemeter 2"}},
        "measure_voltage.3": {"title": {"en": "Voltagemeter 3", "nl": "Voltagemeter 3"}},
        "measure_voltage.4": {"title": {"en": "Voltagemeter 4", "nl": "Voltagemeter 4"}},
        "measure_voltage.5": {"title": {"en": "Voltagemeter 5", "nl": "Voltagemeter 5"}},
        "measure_humidity.1": {"title": {"en": "Humidity Sensor 1", "nl": "Vochtsensor 1"}},
        "measure_humidity.2": {"title": {"en": "Humidity Sensor 2","nl": "Vochtsensor 2"}},
        "measure_humidity.3": {"title": {"en": "Humidity Sensor 3", "nl": "Vochtsensor 3"}},
        "measure_humidity.4": {"title": {"en": "Humidity Sensor 4", "nl": "Vochtsensor 4"}},
        "measure_humidity.5": {"title": {"en": "Humidity Sensor 5", "nl": "Vochtsensor 5"}},
        "measure_humidity.5": {"title": {"en": "Humidity Sensor 5", "nl": "Vochtsensor 5"}},
        "measure_humidity.5": {"title": {"en": "Humidity Sensor 5", "nl": "Vochtsensor 5"}},
        "button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},
        "button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}
      },
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInputExternal1On', 'triggerInputExternal1Off', 'triggerTemperature1', 'triggerTemperature2', 'triggerTemperature3'],
      'triggers_2': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'callbacks': ['single_push', 'long_push', 'double_push', 'triple_push'],
      'icon': '../../../assets/icons/shelly-plus-1.svg',
      'extra': {}
    },
    {
      'hostname': ['shellyplus2pm-roller-', 'ShellyPlus2PM-roller-'],
      'name': 'Shelly Plus 2PM Roller Shutter',
      'gen': 'gen2',
      'type': ['SNSW-002P16EU', 'SNSW-102P16EU'],
      'channels': 1,
      'communication': 'websocket',
      'battery': false,
      'class': 'windowcoverings',
      'capabilities_1': ["windowcoverings_state", "windowcoverings_set", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1", "input_2", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2", "multiInputs"],
      'capabilities_2': [],
      'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},"button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed'],
      'triggers_2': [],
      'callbacks': ['single_push_1', 'long_push_1', 'double_push_1', 'triple_push_1', 'single_push_2', 'long_push_2', 'double_push_2', 'triple_push_2'],
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
      'capabilities_1': ["measure_temperature", "measure_humidity", "measure_battery", "measure_voltage", "rssi", "deviceGen2"],
      'capabilities_2': [],
      'capability_options': {},
      'energy': {"batteries": ["AA", "AA", "AA", "AA"]},
      'triggers_1': [],
      'triggers_2': [],
      'callbacks': [],
      'icon': '../../../assets/icons/shelly-plus-ht.svg',
      'extra': {}
    },
    {
      'hostname': ['shellypro1-', 'ShellyPro1-'],
      'name': 'Shelly Pro 1',
      'gen': 'gen2',
      'type': ['SPSW-001XE16EU', 'SPSW-101XE16EU', 'SPSW-201XE16EU'],
      'channels': 1,
      'communication': 'websocket',
      'battery': false,
      'class': 'socket',
      'capabilities_1': ["onoff", "measure_temperature", "input_1", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': [],
      'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},"button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'triggers_2': [],
      'callbacks': ['single_push', 'long_push', 'double_push', 'triple_push'],
      'icon': '../../../assets/icons/shelly-pro-1.svg',
      'extra': {}
    },
    {
      'hostname': ['shellypro1pm-', 'ShellyPro1PM-'],
      'name': 'Shelly Pro 1PM',
      'gen': 'gen2',
      'type': ['SPSW-001PE16EU', 'SPSW-101PE16EU', 'SPSW-201PE16EU'],
      'channels': 1,
      'communication': 'websocket',
      'battery': false,
      'class': 'socket',
      'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': [],
      'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},"button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'triggers_2': [],
      'callbacks': ['single_push', 'long_push', 'double_push', 'triple_push'],
      'icon': '../../../assets/icons/shelly-pro-1.svg',
      'extra': {}
    },
    {
      'hostname': ['shellypro2-', 'ShellyPro2-'],
      'name': 'Shelly Pro 2',
      'gen': 'gen2',
      'type': ['SPSW-002XE16EU', 'SPSW-102XE16EU', 'SPSW-202XE16EU'],
      'channels': 2,
      'communication': 'websocket',
      'battery': false,
      'class': 'socket',
      'capabilities_1': ["onoff", "measure_temperature", "input_1", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': ["onoff", "measure_temperature", "input_1"],
      'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},"button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'triggers_2': [],
      'callbacks': ['single_push', 'long_push', 'double_push', 'triple_push'],
      'icon': '../../../assets/icons/shelly-pro-1.svg',
      'extra': {}
    },
    {
      'hostname': ['shellypro2-roller-', 'ShellyPro2-roller-'],
      'name': 'Shelly Pro 2 Roller Shutter',
      'gen': 'gen2',
      'type': ['SPSW-002XE16EU', 'SPSW-102XE16EU', 'SPSW-202XE16EU'],
      'channels': 1,
      'communication': 'websocket',
      'battery': false,
      'class': 'windowcoverings',
      'capabilities_1': ["windowcoverings_state", "windowcoverings_set", "measure_temperature", "input_1", "input_2", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2", "multiInputs"],
      'capabilities_2': [],
      'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},"button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed'],
      'triggers_2': [],
      'callbacks': ['single_push_1', 'long_push_1', 'double_push_1', 'triple_push_1', 'single_push_2', 'long_push_2', 'double_push_2', 'triple_push_2'],
      'icon': '../../../assets/icons/shelly-pro-1.svg',
      'extra': {}
    },
    {
      'hostname': ['shellypro2pm-', 'ShellyPro2PM-'],
      'name': 'Shelly Pro 2PM',
      'gen': 'gen2',
      'type': ['SPSW-002PE16EU', 'SPSW-102PE16EU', 'SPSW-202PE16EU'],
      'channels': 2,
      'communication': 'websocket',
      'battery': false,
      'class': 'socket',
      'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1"],
      'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},"button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'triggers_2': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'callbacks': ['single_push', 'long_push', 'double_push', 'triple_push'],
      'icon': '../../../assets/icons/shelly-pro-1.svg',
      'extra': {}
    },
    {
      'hostname': ['shellypro2pm-roller-', 'ShellyPro2PM-roller-'],
      'name': 'Shelly Pro 2PM Roller Shutter',
      'gen': 'gen2',
      'type': ['SPSW-002PE16EU', 'SPSW-102PE16EU', 'SPSW-202PE16EU'],
      'channels': 1,
      'communication': 'websocket',
      'battery': false,
      'class': 'windowcoverings',
      'capabilities_1': ["windowcoverings_state", "windowcoverings_set", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1", "input_2", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2", "multiInputs"],
      'capabilities_2': [],
      'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},"button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed'],
      'triggers_2': [],
      'callbacks': ['single_push_1', 'long_push_1', 'double_push_1', 'triple_push_1', 'single_push_2', 'long_push_2', 'double_push_2', 'triple_push_2'],
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
      'capabilities_1': ["onoff", "measure_temperature", "input_1", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': ["onoff", "measure_temperature", "input_1"],
      'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},"button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'triggers_2': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'callbacks': ['single_push', 'long_push', 'double_push', 'triple_push'],
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
      'class': 'thermostat',
      'capabilities_1': ["target_temperature", "measure_temperature", "measure_battery", "valve_position", "valve_mode", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {"target_temperature": {"min": 5, "max": 30}},
      'energy': {"batteries": ["INTERNAL"]},
      'triggers_1': ['triggerValvePosition'],
      'triggers_2': [],
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
      'capabilities_1': ["onoff", "input_1", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {"measure_temperature": {"title": {"en": "Device Temperature", "nl": "Apparaat temperatuur"}},"measure_temperature.1": {"title": {"en": "Temperature Sensor 1", "nl": "Temperatuursensor 1"}},"measure_temperature.2": {"title": {"en": "Temperature Sensor 2","nl": "Temperatuursensor 2"}},"measure_temperature.3": {"title": {"en": "Temperature Sensor 3", "nl": "Temperatuursensor 3"}}, "measure_temperature.4": {"title": {"en": "Temperature Sensor 4", "nl": "Temperatuursensor 4"}}, "measure_temperature.5": {"title": {"en": "Temperature Sensor 5", "nl": "Temperatuursensor 5"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInputExternal1On', 'triggerInputExternal1Off', 'triggerTemperature1', 'triggerTemperature2', 'triggerTemperature3'],
      'triggers_2': [],
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
      'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_temperature", "input_1", "input_2", "rssi", "deviceGen1", "multiInputs"],
      'capabilities_2': [],
      'capability_options': {"measure_temperature": {"title": {"en": "Device Temperature", "nl": "Apparaat temperatuur"}},"measure_temperature.1": {"title": {"en": "Temperature Sensor 1", "nl": "Temperatuursensor 1"}},"measure_temperature.2": {"title": {"en": "Temperature Sensor 2","nl": "Temperatuursensor 2"}},"measure_temperature.3": {"title": {"en": "Temperature Sensor 3", "nl": "Temperatuursensor 3"}}, "measure_temperature.4": {"title": {"en": "Temperature Sensor 4", "nl": "Temperatuursensor 4"}}, "measure_temperature.5": {"title": {"en": "Temperature Sensor 5", "nl": "Temperatuursensor 5"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed', 'triggerInputExternal1On', 'triggerInputExternal1Off', 'triggerTemperature1', 'triggerTemperature2', 'triggerTemperature3'],
      'triggers_2': [],
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
      'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_temperature", "input_1", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {"measure_temperature": {"title": {"en": "Device Temperature", "nl": "Apparaat temperatuur"}},"measure_temperature.1": {"title": {"en": "Temperature Sensor 1", "nl": "Temperatuursensor 1"}},"measure_temperature.2": {"title": {"en": "Temperature Sensor 2","nl": "Temperatuursensor 2"}},"measure_temperature.3": {"title": {"en": "Temperature Sensor 3", "nl": "Temperatuursensor 3"}}, "measure_temperature.4": {"title": {"en": "Temperature Sensor 4", "nl": "Temperatuursensor 4"}}, "measure_temperature.5": {"title": {"en": "Temperature Sensor 5", "nl": "Temperatuursensor 5"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInputExternal1On', 'triggerInputExternal1Off', 'triggerTemperature1', 'triggerTemperature2', 'triggerTemperature3'],
      'triggers_2': [],
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
      'capabilities_1': ["onoff", "measure_power", "meter_power", "input_1", "rssi", "deviceGen1"],
      'capabilities_2': ["onoff", "input_1"],
      'capability_options': {},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'triggers_2': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
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
      'capabilities_1': ["windowcoverings_state", "windowcoverings_set", "measure_power", "meter_power", "input_1", "input_2", "rssi", "deviceGen1", "multiInputs"],
      'capabilities_2': [],
      'capability_options': {},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed'],
      'triggers_2': [],
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
      'capabilities_1': ["onoff", "measure_power", "meter_power_factor", "measure_current", "measure_voltage", "meter_power_returned", "meter_power", "measure_power.total", "rssi", "deviceGen1"],
      'capabilities_2': ["measure_power", "meter_power_factor", "measure_current", "measure_voltage", "meter_power_returned", "meter_power"],
      'capability_options': {"measure_power.total": {"title": {"en": "Total Power", "nl": "Totale Power"}}},
      'energy': {"cumulative": true},
      'triggers_1': ['triggerMeterPowerFactor', 'triggerMeterPowerReturned', 'triggerMeasurePowerTotal'],
      'triggers_2': ['triggerMeterPowerFactor', 'triggerMeterPowerReturned'],
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
      'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "input_1", "rssi", "deviceGen1"],
      'capabilities_2': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "input_1"],
      'capability_options': {},
      'energy': {"cumulative": true},
      'triggers_1': [],
      'triggers_2': [],
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
      'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "input_1", "measure_temperature", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "input_1", "measure_temperature"],
      'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},"button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': [],
      'triggers_2': [],
      'callbacks': ['single_push', 'long_push', 'double_push', 'triple_push'],
      'icon': '../../../assets/icons/shelly-pro-4pm.svg',
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
      'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_temperature", "input_1", "rssi", "deviceGen1"],
      'capabilities_2': ["onoff", "measure_power", "meter_power", "input_1"],
      'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'triggers_2': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
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
      'capabilities_1': ["windowcoverings_state", "windowcoverings_set", "measure_power", "meter_power", "measure_temperature", "input_1", "input_2", "rssi", "deviceGen1", "multiInputs"],
      'capabilities_2': [],
      'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed'],
      'triggers_2': [],
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
      'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_temperature", "measure_temperature.1", "measure_temperature.2", "measure_temperature.3", "measure_humidity", "input_1", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerTemperature1', 'triggerTemperature2', 'triggerTemperature3'],
      'triggers_2': [],
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
      'capabilities_1': ["onoff", "dim", "light_temperature", "light_hue", "light_saturation", "light_mode", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {},
      'energy': {},
      'triggers_1': [],
      'triggers_2': [],
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
      'capabilities_1': ["onoff", "dim", "light_temperature", "light_hue", "light_saturation", "light_mode", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {"dim": {"opts": {"duration": true }}},
      'energy': {},
      'triggers_1': [],
      'triggers_2': [],
      'callbacks': [],
      'icon': '../../../assets/icons/shellybulb.svg',
      'extra': {'light': {'light_endpoint': 'light', 'dim_component': 'brightness', 'light_temperature': {'min': 3000, 'max': 6500}}}
    },
    {
      'hostname': ['shellybutton1-', 'shellybutton2-'],
      'name': 'Shelly Button',
      'gen': 'gen1',
      'type': ['SHBTN-1', 'SHBTN-2'],
      'channels': 1,
      'communication': 'coap',
      'battery': true,
      'class': 'button',
      'capabilities_1': ["measure_battery", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {},
      'energy': {"batteries": ["INTERNAL"]},
      'triggers_1': [],
      'triggers_2': [],
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
      'capabilities_1': ["onoff", "dim", "measure_power", "meter_power", "measure_temperature", "input_1", "input_2", "rssi", "deviceGen1", "multiInputs"],
      'capabilities_2': [],
      'capability_options': {
        'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},
        "dim": {"opts": {"duration": true }}
      },
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed'],
      'triggers_2': [],
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
      'capabilities_1': ["onoff", "dim", "light_temperature", "measure_power", "meter_power", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {"dim": {"opts": {"duration": true }}},
      'energy': {},
      'triggers_1': [],
      'triggers_2': [],
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
      'capabilities_1': ["alarm_contact", "measure_luminance", "measure_battery", "measure_temperature", "alarm_tamper", "tilt", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {},
      'energy': {"batteries": ["CR123A", "CR123A"]},
      'triggers_1': ['triggerTilt'],
      'triggers_2': [],
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
      'capabilities_1': ["onoff", "measure_power", "measure_voltage", "meter_power", "meter_power_returned", "rssi", "deviceGen1"],
      'capabilities_2': ["onoff", "measure_power", "measure_voltage", "meter_power", "meter_power_returned"],
      'capability_options': {},
      'energy': {"cumulative": true},
      'triggers_1': ['triggerMeterPowerReturned'],
      'triggers_2': ['triggerMeterPowerReturned'],
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
      'capabilities_1': ["alarm_water", "measure_temperature", "measure_battery", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {},
      'energy': {"batteries": ["CR123A"]},
      'triggers_1': [],
      'triggers_2': [],
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
      'capabilities_1': ["alarm_smoke", "gas_concentration", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {},
      'energy': {},
      'triggers_1': ['triggerGasConcentration'],
      'triggers_2': [],
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
      'battery': true,
      'class': 'sensor',
      'capabilities_1': ["measure_humidity", "measure_temperature", "measure_battery", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {},
      'energy': {"batteries": ["CR123A"]},
      'triggers_1': [],
      'triggers_2': [],
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
      'capabilities_1': ["input_1", "input_2", "input_3", "rssi", "deviceGen1", "multiInputs"],
      'capabilities_2': [],
      'capability_options': {},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed', 'triggerInput3On', 'triggerInput3Off', 'triggerInput3Changed'],
      'triggers_2': [],
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
      'capabilities_1': ["input_1", "input_2", "input_3", "input_4", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2", "multiInputs"],
      'capabilities_2': [],
      'capability_options': {
        "measure_temperature.1": {"title": {"en": "Temperature Sensor 1", "nl": "Temperatuursensor 1"}},
        "measure_temperature.2": {"title": {"en": "Temperature Sensor 2","nl": "Temperatuursensor 2"}},
        "measure_temperature.3": {"title": {"en": "Temperature Sensor 3", "nl": "Temperatuursensor 3"}},
        "measure_temperature.4": {"title": {"en": "Temperature Sensor 4", "nl": "Temperatuursensor 4"}},
        "measure_temperature.5": {"title": {"en": "Temperature Sensor 5", "nl": "Temperatuursensor 5"}},
        "measure_voltage.1": {"title": {"en": "Voltagemeter 1", "nl": "Voltagemeter 1"}},
        "measure_voltage.2": {"title": {"en": "Voltagemeter 2", "nl": "Voltagemeter 2"}},
        "measure_voltage.3": {"title": {"en": "Voltagemeter 3", "nl": "Voltagemeter 3"}},
        "measure_voltage.4": {"title": {"en": "Voltagemeter 4", "nl": "Voltagemeter 4"}},
        "measure_voltage.5": {"title": {"en": "Voltagemeter 5", "nl": "Voltagemeter 5"}},
        "measure_humidity.1": {"title": {"en": "Humidity Sensor 1", "nl": "Vochtsensor 1"}},
        "measure_humidity.2": {"title": {"en": "Humidity Sensor 2","nl": "Vochtsensor 2"}},
        "measure_humidity.3": {"title": {"en": "Humidity Sensor 3", "nl": "Vochtsensor 3"}},
        "measure_humidity.4": {"title": {"en": "Humidity Sensor 4", "nl": "Vochtsensor 4"}},
        "measure_humidity.5": {"title": {"en": "Humidity Sensor 5", "nl": "Vochtsensor 5"}},
        "measure_humidity.5": {"title": {"en": "Humidity Sensor 5", "nl": "Vochtsensor 5"}},
        "measure_humidity.5": {"title": {"en": "Humidity Sensor 5", "nl": "Vochtsensor 5"}},
        "button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},
        "button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}
      },
      'energy': {},
      'triggers_1': [
        'triggerInput1On',
        'triggerInput1Off',
        'triggerInput1Changed',
        'triggerInput2On',
        'triggerInput2Off',
        'triggerInput2Changed',
        'triggerInput3On',
        'triggerInput3Off',
        'triggerInput3Changed',
        'triggerInput4On',
        'triggerInput4Off',
        'triggerInput4Changed',
        'triggerTemperature1',
        'triggerTemperature2',
        'triggerTemperature3',
        'triggerTemperature4',
        'triggerTemperature5',
        'triggerHumidity1',
        'triggerHumidity2',
        'triggerHumidity3',
        'triggerHumidity4',
        'triggerHumidity5',
        'triggerVoltmeter1',
        'triggerVoltmeter2',
        'triggerVoltmeter3',
        'triggerVoltmeter4',
        'triggerVoltmeter5',
        'triggerPlusInputExternal1On',
        'triggerPlusInputExternal1Off',
        'triggerPlusInputExternal1Changed',
        'triggerPlusInputExternal2On',
        'triggerPlusInputExternal2Off',
        'triggerPlusInputExternal2Changed',
        'triggerPlusInputExternal3On',
        'triggerPlusInputExternal3Off',
        'triggerPlusInputExternal3Changed'
      ],
      'triggers_2': [],
      'callbacks': [
        'single_push_1',
        'long_push_1',
        'double_push_1',
        'triple_push_1',
        'single_push_2',
        'long_push_2',
        'double_push_2',
        'triple_push_2',
        'single_push_3',
        'long_push_3',
        'triple_push_3',
        'double_push_3',
        'single_push_4',
        'long_push_4',
        'double_push_4',
        'triple_push_4'
      ],
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
      'capabilities_1': ["alarm_motion", "measure_luminance", "measure_battery", "alarm_tamper", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {},
      'energy': {"batteries": ["INTERNAL"]},
      'triggers_1': [],
      'triggers_2': [],
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
      'capabilities_1': ["alarm_motion", "measure_luminance", "measure_temperature", "measure_battery", "alarm_tamper", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {},
      'energy': {"batteries": ["INTERNAL"]},
      'triggers_1': [],
      'triggers_2': [],
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
      'capabilities_1': ["onoff", "dim", "dim.white", "light_temperature", "light_hue", "light_saturation", "measure_power", "meter_power", "light_mode", "onoff.whitemode", "input_1", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {"dim": {"opts": {"duration": true}}, "dim.white": {"title": {"en": "Dimlevel white","nl": "Dim niveau wit"}}, "light_temperature": {"title": {"en": "Dimlevel white","nl": "Dim niveau wit"}}, "onoff.whitemode": {"title": {"en": "Toggle white mode","nl": "Wit modus schakelen"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'triggers_2': [],
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
      'capabilities_1': ["onoff", "dim", "measure_power", "measure_power.total", "meter_power", "input_1", "rssi", "deviceGen1"],
      'capabilities_2': ["onoff", "dim", "measure_power", "meter_power", "input_1"],
      'capability_options': {"dim": {"opts": {"duration": true}}, "measure_power.total": {"title": {"en": "Total Power", "nl": "Totaal vermogen"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'triggers_2': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
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
      'capabilities_1': ["alarm_smoke", "measure_temperature", "measure_battery", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {},
      'energy': {"batteries": ["AA"]},
      'triggers_1': [],
      'triggers_2': [],
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
      'capabilities_1': ["onoff", "measure_voltage", "input_1", "rssi", "deviceGen1"],
      'capabilities_2': ["onoff", "measure_voltage", "input_1"],
      'capability_options': {"measure_temperature.1": {"title": {"en": "Temperature Sensor 1","nl": "Temperatuursensor 1"}}, "measure_temperature.2": {"title": {"en": "Temperature Sensor 2","nl": "Temperatuursensor 2"}}, "measure_temperature.3": {"title": {"en": "Temperature Sensor 3","nl": "Temperatuursensor 3"}}, "measure_voltage": {"title": {"en": "ADC Voltage","nl": "ADC Voltage"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerTemperature1', 'triggerTemperature2', 'triggerInput2Changed', 'triggerTemperature3'],
      'triggers_2': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
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
      'capabilities_1': ["onoff", "dim", "measure_power", "meter_power", "rssi", "deviceGen1"],
      'capabilities_2': [],
      'capability_options': {"dim": {"opts": {"duration": true}}},
      'energy': {},
      'triggers_1': [],
      'triggers_2': [],
      'callbacks': [],
      'icon': '../../../assets/icons/shellyrgbw2.svg',
      'extra': {'light': {'light_endpoint': 'light', 'dim_component': 'brightness'}}
    },
    {
      'hostname': ['shellypluswdus-', 'ShellyPlusWDUS-'],
      'name': 'Shelly Plus Wall Dimmer',
      'gen': 'gen2',
      'type': ['SNDM-0013US'],
      'channels': 1,
      'communication': 'websocket',
      'battery': false,
      'class': 'light',
      'capabilities_1': ["onoff", "dim", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': [],
      'capability_options': {"dim": {"opts": {"duration": false }},"button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': [],
      'triggers_2': [],
      'callbacks': [],
      'icon': '../../../assets/icons/shelly-plus-walldimmer-us.svg',
      'extra': {'light': {'light_endpoint': 'light', 'dim_component': 'brightness'}}
    },
    {
      'hostname': ['shellypro3em-', 'ShellyPro3EM-'],
      'name': 'Shelly Pro 3EM',
      'gen': 'gen2',
      'type': ['SPEM-003CEBEU', 'SPEM-003CEBEU120', 'SPEM-003CEBEU400'],
      'channels': 3,
      'communication': 'websocket',
      'battery': false,
      'class': 'other',
      'capabilities_1': ["measure_power", "measure_power.total", "measure_current", "measure_current.total", "measure_voltage", "meter_power_factor", "meter_power", "meter_power.returned", "meter_power.total", "meter_power.total_returned", "measure_temperature", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': ["measure_power", "measure_current", "measure_voltage", "meter_power_factor", "meter_power", "meter_power.returned", "measure_temperature" ],
      'capability_options': {
        "measure_temperature": {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},
        "measure_power.total": {"title": {"en": "Total Power", "nl": "Totale power"}},
        "measure_current.total": {"title": {"en": "Total Current", "nl": "Totale stroomsterkte"}},
        "meter_power.total": {"title": {"en": "Total Energy", "nl": "Totale energie"}},
        "meter_power.returned": {"title": {"en": "Energy Returned", "nl": "Retour energie"}},
        "meter_power.total_returned": {"title": {"en": "Total Energy Returned", "nl": "Totale retour energie"}},
        "button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},
        "button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}
      },
      'energy': {"cumulative": true},
      'triggers_1': ['triggerMeterPowerFactor', 'triggerMeasurePowerTotal', 'triggerMeterPowerTotal', 'triggerMeterPowerReturned', 'triggerMeterPowerReturnedTotal'],
      'triggers_2': ['triggerMeterPowerFactor','triggerMeterPowerReturned'],
      'callbacks': [],
      'icon': '../../../assets/icons/shelly-pro-3em.svg',
      'extra': {}
    },
    {
      'hostname': ['shellyplussmoke-', 'ShellyPlusSmoke-'],
      'name': 'Shelly Plus Smoke',
      'gen': 'gen2',
      'type': ['SNSN-0031Z'],
      'channels': 1,
      'communication': 'websocket',
      'battery': true,
      'class': 'sensor',
      'capabilities_1': ["alarm_smoke", "measure_battery", "measure_voltage", "rssi", "deviceGen2", "devicePlusSmoke"],
      'capabilities_2': [],
      'capability_options': {},
      'energy': {"batteries": ["CR123A"]},
      'triggers_1': [],
      'triggers_2': [],
      'callbacks': [],
      'icon': '../../../assets/icons/shelly-plus-smoke.svg',
      'extra': {}
    },
    {
      'hostname': ['shellyplusplugs-', 'ShellyPlusPlugS-', 'shellyplusplugit-', 'ShellyPlusPlugIT-', 'ShellyPlugIT-', 'shellypluspluguk-', 'ShellyPlusPlugUK-', 'ShellyPlugUK-', 'shellyplusplugus-', 'ShellyPlusPlugUS-', 'ShellyPlugUS-'],
      'name': 'Shelly Plus Plug S',
      'gen': 'gen2',
      'type': ['SNPL-00112EU', 'SNPL-00110IT', 'SNPL-00112UK', 'SNPL-00116US'],
      'channels': 1,
      'communication': 'websocket',
      'battery': false,
      'class': 'socket',
      'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': [],
      'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},"button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': [],
      'triggers_2': [],
      'callbacks': [],
      'icon': '../../../assets/icons/shelly-plus-plug-s.svg',
      'extra': {}
    },
    {
      'hostname': ['shellyblubutton1-', 'ShellyBLUButton1-'],
      'name': 'Shelly BLU Button1',
      'gen': 'gen2',
      'type': ['SBBT-002C'],
      'channels': 1,
      'communication': 'bluetooth',
      'battery': true,
      'class': 'button',
      'capabilities_1': ["measure_battery", "beacon", "deviceBLU"],
      'capabilities_2': [],
      'capability_options': {},
      'settings': {"beacon_timeout": 5},
      'energy': {"batteries": ["CR2032"]},
      'triggers_1': [],
      'triggers_2': [],
      'callbacks': ['shortpush', 'double_shortpush', 'triple_shortpush', 'longpush', 'very_longpush', 'hold'],
      'icon': '../../../assets/icons/shellyblubutton1.svg',
      'extra': {}
    },
    {
      'hostname': ['shellybludoorwindow-', 'ShellyBLUDoorWindow-'],
      'name': 'Shelly BLU DoorWindow',
      'gen': 'gen2',
      'type': ['SBDW-002C'],
      'channels': 1,
      'communication': 'bluetooth',
      'battery': true,
      'class': 'sensor',
      'capabilities_1': ["measure_battery", "alarm_contact", "measure_luminance", "tilt", "deviceBLU"],
      'capabilities_2': [],
      'capability_options': {},
      'settings': {"invertAlarm": false},
      'energy': {"batteries": ["CR2032"]},
      'triggers_1': ['triggerTilt'],
      'triggers_2': [],
      'callbacks': [],
      'icon': '../../../assets/icons/shellydw.svg',
      'extra': {}
    },
    {
      'hostname': ['shellyproem50-', 'ShellyProEM50-'],
      'name': 'Shelly Pro EM',
      'gen': 'gen2',
      'type': ['SPEM-002CEBEU50'],
      'channels': 2,
      'communication': 'websocket',
      'battery': false,
      'class': 'other',
      'capabilities_1': ["onoff", "measure_power", "measure_power_apparent", "measure_current", "measure_voltage", "meter_power_factor", "meter_power", "meter_power.returned", "measure_temperature", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': ["measure_power", "measure_power_apparent", "measure_current", "measure_voltage", "meter_power_factor", "meter_power", "meter_power.returned"],
      'capability_options': {
        "measure_temperature": {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},
        "meter_power.returned": {"title": {"en": "Total Energy Returned", "nl": "Totale retour energie"}},
        "button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},
        "button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}
      },
      'energy': {"cumulative": true},
      'triggers_1': ['triggerMeterPowerFactor', 'triggerMeterPowerReturned'],
      'triggers_2': ['triggerMeterPowerFactor', 'triggerMeterPowerReturned'],
      'callbacks': [],
      'icon': '../../../assets/icons/shelly-pro-3em.svg',
      'extra': {}
    },
    {
      'hostname': ['shellypro2cover-', 'ShellyPro2Cover-'],
      'name': 'Shelly Pro Dual Cover',
      'gen': 'gen2',
      'type': ['SPSH-002PE16EU'],
      'channels': 2,
      'communication': 'websocket',
      'battery': false,
      'class': 'windowcoverings',
      'capabilities_1': ["windowcoverings_state", "windowcoverings_set", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1", "input_2", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2", "multiDividedInputs"],
      'capabilities_2': ["windowcoverings_state", "windowcoverings_set", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_3", "input_4", "multiDividedInputs"],
      'capability_options': {'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},"button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed'],
      'triggers_2': ['triggerInput3On', 'triggerInput3Off', 'triggerInput3Changed', 'triggerInput4On', 'triggerInput4Off', 'triggerInput4Changed'],
      'callbacks': ['single_push_1', 'long_push_1', 'double_push_1', 'triple_push_1', 'single_push_2', 'long_push_2', 'double_push_2', 'triple_push_2', 'single_push_3', 'long_push_3', 'double_push_3', 'triple_push_3', 'single_push_4', 'long_push_4', 'double_push_4', 'triple_push_4'],
      'icon': '../../../assets/icons/shelly-pro-4pm.svg',
      'extra': {}
    },
    {
      'hostname': ['shellywalldisplay-', 'ShellyWallDisplay-'],
      'name': 'Shelly Wall Display',
      'gen': 'gen2',
      'type': ['SAWD-0A1XX10EU1'],
      'channels': 1,
      'communication': 'websocket',
      'battery': false,
      'class': 'socket',
      'capabilities_1': ["onoff", "measure_temperature", "measure_humidity", "measure_luminance", "input_1", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': [],
      'capability_options': {"button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'triggers_2': [],
      'callbacks': [],
      'icon': '../../../assets/icons/shellywalldisplay.svg',
      'extra': {}
    },
    {
      'hostname': ['shellywalldisplay-thermostat-', 'ShellyWallDisplay-thermostat-'],
      'name': 'Shelly Wall Display Thermostat',
      'gen': 'gen2',
      'type': ['SAWD-0A1XX10EU1'],
      'channels': 1,
      'communication': 'websocket',
      'battery': false,
      'class': 'thermostat',
      'capabilities_1': ["measure_temperature", "measure_humidity", "measure_luminance", "measure_temperature.thermostat", "target_temperature", "input_1", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': [],
      'capability_options': {"measure_temperature.thermostat": {"title": {"en": "Thermostat Temperature","nl": "Thermostaat temperatuur"}}, "button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'triggers_2': [],
      'callbacks': [],
      'icon': '../../../assets/icons/shellywalldisplay.svg',
      'extra': {}
    },
    {
      'hostname': ['shellyblumotion-'],
      'name': 'Shelly BLU Motion',
      'gen': 'gen2',
      'type': ['SBMO-003Z'],
      'channels': 1,
      'communication': 'bluetooth',
      'battery': true,
      'class': 'sensor',
      'capabilities_1': ["measure_battery", "alarm_motion", "measure_luminance", "deviceBLU"],
      'capabilities_2': [],
      'capability_options': {},
      'settings': {},
      'energy': {"batteries": ["CR2477"]},
      'triggers_1': [],
      'triggers_2': [],
      'callbacks': [],
      'icon': '../../../assets/icons/shellyblumotion.svg',
      'extra': {}
    },
    {
      'hostname': ['shellypmmini-', 'ShellyPMMini-'],
      'name': 'Shelly Plus PM Mini',
      'gen': 'gen2',
      'type': ['SNPM-001PCEU16'],
      'channels': 1,
      'communication': 'websocket',
      'battery': false,
      'class': 'sensor',
      'capabilities_1': ["measure_power", "meter_power", "measure_voltage", "measure_current", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': [],
      'capability_options': {"button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': [],
      'triggers_2': [],
      'callbacks': [],
      'icon': '../../../assets/icons/shelly-plus-pm-mini.svg',
      'extra': {}
    },
    {
      'hostname': ['shelly1mini-', 'Shelly1Mini-'],
      'name': 'Shelly Plus 1 Mini',
      'gen': 'gen2',
      'type': ['SNSW-001X8EU'],
      'channels': 1,
      'communication': 'websocket',
      'battery': false,
      'class': 'socket',
      'capabilities_1': ["onoff", "measure_temperature", "input_1", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': [],
      'capability_options': {"measure_temperature": {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}, "button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'triggers_2': [],
      'callbacks': ['single_push', 'long_push', 'double_push', 'triple_push'],
      'icon': '../../../assets/icons/shelly-plus-1-mini.svg',
      'extra': {}
    },
    {
      'hostname': ['shelly1pmmini-', 'Shelly1PMMini-'],
      'name': 'Shelly Plus 1PM Mini',
      'gen': 'gen2',
      'type': ['SNSW-001P8EU'],
      'channels': 1,
      'communication': 'websocket',
      'battery': false,
      'class': 'socket',
      'capabilities_1': ["onoff", "measure_power", "meter_power", "measure_voltage", "measure_current", "measure_temperature", "input_1", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': [],
      'capability_options': {"measure_temperature": {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}}, "button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'triggers_2': [],
      'callbacks': ['single_push', 'long_push', 'double_push', 'triple_push'],
      'icon': '../../../assets/icons/shelly-plus-pm-mini.svg',
      'extra': {}
    },
    {
      'hostname': ['shellyplusuni-', 'ShellyPlusUni-'],
      'name': 'Shelly Plus Uni',
      'gen': 'gen2',
      'type': ['SNSN-0043X'],
      'channels': 2,
      'communication': 'websocket',
      'battery': false,
      'class': 'socket',
      'capabilities_1': ["onoff", "input_1", "rssi", "deviceGen2"],
      'capabilities_2': ["onoff", "input_1"],
      'capability_options': {"measure_temperature.1": {"title": {"en": "Temperature Sensor 1","nl": "Temperatuursensor 1"}}, "measure_temperature.2": {"title": {"en": "Temperature Sensor 2","nl": "Temperatuursensor 2"}}, "measure_temperature.3": {"title": {"en": "Temperature Sensor 3","nl": "Temperatuursensor 3"}}, "measure_voltage": {"title": {"en": "ADC Voltage","nl": "ADC Voltage"}}},
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerTemperature1', 'triggerTemperature2', 'triggerInput2Changed', 'triggerTemperature3'],
      'triggers_2': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed'],
      'callbacks': ['single_push', 'long_push', 'double_push', 'triple_push'],
      'icon': '../../../assets/icons/shellyuni.svg',
      'extra': {}
    },
    {
      'hostname': ['shellyblugw-', 'ShellyBluGw-'],
      'name': 'Shelly Blu Gateway',
      'gen': 'gen2',
      'type': ['SBGW-001X', 'SNGW-BT01'],
      'channels': 1,
      'communication': 'websocket',
      'battery': false,
      'class': 'other',
      'capabilities_1': ["rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2"],
      'capabilities_2': [],
      'capability_options': {"button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},"button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}},
      'energy': {},
      'triggers_1': [],
      'triggers_2': [],
      'callbacks': [],
      'icon': '../../../assets/icons/shellyblugateway.svg',
      'extra': {}
    },
    {
      'hostname': ['shellyplus010v-', 'ShellyPlus010V-'],
      'name': 'Shelly Plus 0-10V Dimmer',
      'gen': 'gen2',
      'type': ['SNDM-00100WW', 'SNGW-0A11WW010'],
      'channels': 1,
      'communication': 'websocket',
      'battery': false,
      'class': 'light',
      'capabilities_1': ["onoff", "dim", "input_1", "input_2", "measure_temperature", "rssi", "button.enable_ble_script", "button.disable_ble_script", "deviceGen2", "multiInputs"],
      'capabilities_2': [],
      'capability_options': {
        'measure_temperature': {"title": {"en": "Device Temperature","nl": "Apparaat temperatuur"}},
        "dim": {"opts": {"duration": false }},
        "button.enable_ble_script": {"maintenanceAction": true, "title": {"en": "Start BLE Proxy", "nl": "Start BLE Proxy"}},
        "button.disable_ble_script": {"maintenanceAction": true, "title": {"en": "Stop BLE Proxy", "nl": "Stop BLE Proxy"}}
      },
      'energy': {},
      'triggers_1': ['triggerInput1On', 'triggerInput1Off', 'triggerInput1Changed', 'triggerInput2On', 'triggerInput2Off', 'triggerInput2Changed'],
      'triggers_2': [],
      'callbacks': ['single_push_1', 'long_push_1', 'double_push_1', 'triple_push_1', 'single_push_2', 'long_push_2', 'double_push_2', 'triple_push_2'],
      'icon': '../../../assets/icons/shelly-plus-10v-dimmer.svg',
      'extra': {'light': {'light_endpoint': 'light', 'dim_component': 'brightness'}}
    }
  ];

  static ble_device_types = [
    "SBBT-002C",
    "SBDW-002C",
    "SBMO-003Z"
  ];

  static actionEventsStatusMapping = {
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
      'triple_push': 'triple_push',
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
        'SSS': 'triple_push'
      }
    },
    'bluetooth': {
      '1': 'shortpush',
      '2': 'double_shortpush',
      '3': 'triple_shortpush',
      '4': 'longpush',
      '5': 'very_longpush',
      '254': 'hold',
    }
  };

  static actionEventsFlowcard = {
    'single_push': 'Single Push',
    'single_push_1': 'Single Push 1',
    'single_push_2': 'Single Push 2',
    'single_push_3': 'Single Push 3',
    'single_push_4': 'Single Push 4',
    'shortpush': 'Short Push',
    'shortpush_1': 'Short Push 1',
    'shortpush_2': 'Short Push 2',
    'shortpush_3': 'Short Push 3',
    'shortpush_4': 'Short Push 4',
    'longpush': 'Long Push',
    'longpush_1': 'Long Push 1',
    'longpush_2': 'Long Push 2',
    'longpush_3': 'Long Push 3',
    'longpush_4': 'Long Push 4',
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
    'double_shortpush_4': 'Double Short Push 4',
    'triple_shortpush': 'Triple Short Push',
    'triple_shortpush_1': 'Triple Short Push 1',
    'triple_shortpush_2': 'Triple Short Push 2',
    'triple_shortpush_3': 'Triple Short Push 3',
    'triple_shortpush_4': 'Triple Short Push 4',
    'triple_push_1': 'Triple Push 1',
    'triple_push_2': 'Triple Push 2',
    'triple_push_3': 'Triple Push 3',
    'triple_push_4': 'Triple Push 4',
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
    'btn_up_4': 'Button Up 4',
    'very_longpush': 'Very Long Push',
    'hold': 'Hold'
  };

  static ble_script = `/**
  * Homey BLE Proxy Script
  * This script listens to BLE advertisements of Shelly BLU devices
  * and forwards them to Homey over websocket
  */
 
 // SUPPORTED DEVICES
 let supported_device = ['SBBT-002C', 'SBDW-002C', 'SBMO-003Z'];
 
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
 BTH[0x21] = { n: 'alarm_motion', t: this.uint8 };
 
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
   if (supported_device.indexOf(res.local_name) === -1) return;
   if (typeof res.service_data === 'undefined' || typeof res.service_data[BTHOME_SVC_ID_STR] === 'undefined') return;
   if (typeof res.addr === 'undefined' || typeof res.local_name === 'undefined' || typeof res.local_name !== 'string') return;
 
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
   if (bleScanSuccess === false) {
     Timer.set(1000, false, startBLEScan);
   } else {
     console.log('Success: Homey Bluetooth Proxy running');
   }
 }
 
 // CHECK IF BLE IS ENABLED AND START SCAN
 let BLEConfig = Shelly.getComponentConfig('ble');
 if (BLEConfig.enable === false) {
   console.log('Error: BLE not enabled');
 } else {
   Timer.set(1000, false, startBLEScan);
 }`;

  constructor(opts) {
    this.homey = opts.homey;
    this.digests = {};
    this.digests_auth = {};
    this.digest_retries = {};
    this.devicetypes = {
      gen1: false,
      gen2: false,
      cloud: false,
      bluetooth: false
    }
  }

  /* GENERIC FUNCTION FOR SENDING HTTP COMMANDS */
  async sendCommand(endpoint, address, username, password) {
    try {
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
      return await axios('http://'+ address + endpoint, options)
        .then((response) => {
          return Promise.resolve(response.data);
        })
        .catch(async (error) => {
          if (error.response) {
            return this.checkStatus(error.response);
          } else if (error.request) {
            throw new Error(this.homey.__('util.unreachableerror')+ ' The request was made to http://'+ address + endpoint);
          } else {
            throw new Error(this.homey.__('util.unknownerror'));
          }
        });     
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /* GENERIC FUNCTION FOR SENDING HTTP COMMANDS WITH DIGEST AUTHENTICATION FOR GEN2 */
  async sendRPCCommand(endpoint, address, password, requesttype='GET', payload={}) {
    try {
      let options = {}
      if (this.digests_auth[address]) {
        options = {
          method: requesttype,
          headers: {
            "Content-Type": "application/json",
            "Authorization": this.digests_auth[address].authorization(requesttype, endpoint),
          }
        }
      } else {
        options = { method: requesttype }
        if (requesttype !== 'GET') {
          options.headers = {"Content-Type": "application/json"}
        }
      }
      if (Object.keys(payload).length !== 0) {
        options.data = payload;
      }
      if (!this.digest_retries[address]) {
        this.digest_retries[address] = 0;
      }

      return await axios('http://'+ address + endpoint, options)
        .then((response) => {
          this.checkStatus(response);
          return Promise.resolve(response.data);
        })
        .catch(async (error) => {
          if (error.response) {
            if (error.response.status === 401) {
              // create digest header for digest authentication
              if (error.response.headers.get("www-authenticate") != undefined && (this.digest_retries[address] <= 2 || this.digest_retries[address] == undefined)) {
                this.digest_retries[address]++;
                const challenges = Auth.parseHeaders(error.response.headers.get("www-authenticate"));
                const auth = Auth.create(challenges);
                auth.credentials("admin", password);
                this.digests_auth[address] = auth;
        
                // resending command with digest authentication
                options = {
                  method: requesttype,
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": this.digests_auth[address].authorization(requesttype, endpoint),
                  }
                }
                return await axios('http://'+ address + endpoint, options)
                  .then((response) => {
                    this.digest_retries[address] = 0;
                    return Promise.resolve(response.data);
                  })
                  .catch(async (error) => {
                    if (error.response) {
                      this.checkStatus(error.response);
                      return Promise.resolve(error.response.data);
                    } else if (error.request) {
                      return Promise.reject({"message": this.homey.__('util.404') +' Error: the request failed.'});
                    } else {
                      return Promise.reject({"message": this.homey.__('util.unknownerror') +' Error message: '+ error.message });
                    }
                  });
              }
            } else {
              this.checkStatus(error.response);
              return Promise.resolve(error.response.data);
            }
          } else if (error.request) {
            return Promise.reject({"message": this.homey.__('util.unreachableerror')+ ' The request was made to http://'+ address + endpoint});
          } else {
            return Promise.reject({"message": this.homey.__('util.unknownerror') +' Error message: '+ error.message });
          }
          
        });

    } catch (error) {
      return Promise.reject(error);
    }
  }

  /* GENERIC FUNCTION FOR CREATING A PAIRED SHELLY COLLECTION - USED TO MATCH INCOMING STATUS UPDATES */
  async getShellies(purpose) {
    try {
      const drivers = Object.values(this.homey.drivers.getDrivers());
      let shellies = [];
      let allActions = [];
      for (const driver of drivers) {
        const devices = driver.getDevices();
        for (const device of devices) {
          if (device.getStoreValue('communication') !== 'zwave') {
            if (purpose === 'collection') {
              if (device.getStoreValue('communication') === 'cloud') {
                this.devicetypes.cloud = true;
              } else if (device.getStoreValue('communication') === 'bluetooth') {
                this.devicetypes.bluetooth = true;
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
              shellies.push({
                id: device.getData().id,
                name: device.getName(),
                channel: device.getStoreValue('channel'),
                main_device: device.getStoreValue('main_device'),
                gen: device.getStoreValue('gen'),
                communication: device.getStoreValue('communication'),
                device: device
              });
            } else if (purpose === 'flowcard') {
              if (device.getStoreValue('config') !== null) {
                const callbacks = device.getStoreValue('config').callbacks;
                if (callbacks.length > 0) {
                  let manifest = driver.manifest;
                  let tempActions = allActions;
                  allActions = tempActions.concat(callbacks.filter((item) => tempActions.indexOf(item) < 0));
                  shellies.push({
                    id: device.getData().id,
                    name: device.getName(),
                    icon: manifest.icon,
                    actions: callbacks
                  });
                }
              }
            }
          }
        }
      }
      if (purpose === 'flowcard') {
        shellies = shellies.sort((a, b) => a.name.localeCompare(b.name));
        shellies.unshift({
          id: 'all',
          name: this.homey.__('util.any_device'),
          icon: '/assets/icon.svg',
          actions: allActions
        });
      }
      return Promise.resolve(shellies);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /* GENERIC FUNCTION TO RETRIEVE AVAILABLE ACTION USED IN THE GENERIC ACTION EVENT FLOWCARD */
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
      console.error(error);
    }
  }

  /**
   * COAP RELATED FUNCTIONS
   */

  /* FUNCTION TO ENABLE UNICAST COAP FOR GEN1 DEVICES */
  async setUnicast(address, username, password) {
    try {
      const settings = await this.sendCommand('/settings', address, username, password);
      if (settings.hasOwnProperty("coiot")) {
        if (settings.coiot.hasOwnProperty("peer")) {
          const homey_ip = await this.homey.cloud.getLocalAddress();
          const result = await this.sendCommand('/settings?coiot_enable=true&coiot_peer='+ homey_ip.substring(0, homey_ip.length-3), address, username, password);
          const reboot = await this.sendCommand('/reboot', address, username, password);
          return Promise.resolve('OK');
        }
      } else {
        throw new Error('Device with IP address '+ address +' does not support unicast, make sure you update your Shelly to the latest firmware.');
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * WEBSOCKET RELATED FUNCTIONS
   */

  /* FUNCTION TO ADD WEBSOCKET SERVER CONFIG FOR GEN2 DEVICES */
  async setWsServer(address, password) {
    try {
      const homey_ip = await this.homey.cloud.getLocalAddress();
      const config = await this.sendRPCCommand('/rpc/Shelly.GetConfig', address, password);
      if (config.hasOwnProperty("ws")) {
        const payload = '{"id":0, "method":"ws.setconfig", "params":{"config":{"ssl_ca":"*", "server":"ws://'+ homey_ip.slice(0, -3) +':6113/", "enable":true}}}';
        const settings = await this.sendRPCCommand('/rpc', address, password, 'POST', payload);
        const reboot = await this.sendRPCCommand('/rpc/Shelly.Reboot', address, password);
        return Promise.resolve('OK');
      } else {
        throw new Error('Device with IP address '+ address +' does not support outbound websocket, make sure you update your Shelly to the latest firmware.');
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * CLOUD RELATED FUNCTIONS
   */

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

  /**
   * BLUETOOTH RELATED FUNCTIONS
   */

  filterBLEDevices(type) {
    return Util.ble_device_types.includes(type);
  }

  async sendChunkedScript(script_id, address, password) {
    try {
      const chunks = this.chunkString(Util.ble_script, 1024);
      const numChunks = chunks.length;
    
      for (let i = 0; i < numChunks; i++) {
        const chunk = chunks[i];
        const shouldAppend = i !== 0;
        const params = JSON.stringify({"id": script_id, "code": chunk, "append": shouldAppend });

        await this.sleep(500);
        await this.sendRPCCommand('/rpc', address, password, 'POST', '{"id":1,"method":"Script.PutCode","params":'+ params +'}');
      }
      return Promise.resolve(true);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  chunkString(str, size) {
    const numChunks = Math.ceil(str.length / size);
    const chunks = new Array(numChunks);
  
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substr(o, size);
    }
  
    return chunks;
  }

  /* FUNCTION FOR ENABLING BLE EVENT PROXY ON PLUS/PRO */
  async enableBLEProxy(script_id = null, address, password) {
    try {

      if (typeof script_id == 'number') {
        await this.sendRPCCommand('/rpc', address, password, 'POST', '{"id":1,"method":"Script.Delete","params":{"id":'+ Number(script_id) +'}}');
      }
      
      const scriptCreated = await this.sendRPCCommand('/rpc', address, password, 'POST', '{"id":1,"method":"Script.Create","params":{"name":"Homey BLE Proxy"}}');
      await this.sendChunkedScript(scriptCreated.result.id, address, password);

      const checkBluetooth = await this.sendRPCCommand('/rpc/BLE.GetConfig', address, password);
      if (!checkBluetooth.enable) {
        await this.sendRPCCommand('/rpc', address, password, 'POST', '{"id":1,"method":"BLE.SetConfig","params":{"config":{"enable":true,"rpc":{"enable":true},"observer":{"enable":false}}}}');
        await this.sendRPCCommand('/rpc/Shelly.Reboot', address, password);
      }
      
      await this.sendRPCCommand('/rpc', address, password, 'POST', '{"id":1,"method":"Script.Start","params":{"id":'+ scriptCreated.result.id +'}}');

      return Promise.resolve(scriptCreated.result.id);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /* FUNCTION FOR ENABLING BLE EVENT PROXY ON PLUS/PRO */
  async disableBLEProxy(script_id, address, password) {
    try {
      return await this.sendRPCCommand('/rpc', address, password, 'POST', '{"id":1,"method":"Script.Delete","params":{"id":'+ Number(script_id) +'}}');
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * HELPER FUNCTIONS
   */

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
      );
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
      const no_profiles = [];
      no_profiles.push(
        {
          id: "0",
          name: "Disabled",
        }
      );
      return Promise.resolve(no_profiles);
    }
  }

  /* FUNCTION FOR UPLOADING A CUSTOM DEVICE ICON */
  uploadIcon(img, id) {
    return new Promise((resolve, reject) => {
      const path = "../userdata/"+ id +".svg";
      const base64 = img.replace("data:image/svg+xml;base64,", '');
      fs.writeFile(path, base64, 'base64', (error) => {
        if (error) {
          return reject(error);
        } else {
          return resolve(true);
        }
      });
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

  /* HELPER FOR GETTING THE CORRECT ACTION EVENT */
  getActionEventDescription(code, communication, gen) {
    try {
      let action_event;
      if (communication === 'cloud') {
        action_event = Util.actionEventsStatusMapping[communication][gen][code];
      } else {
        action_event = Util.actionEventsStatusMapping[communication][code];
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

  /* HELPER FOR GETTING PAIRED DEVICE TYPES, USED TO DETERMINE WHICH SERVICES TO ACTIVATE */
  getDeviceType(type) {
    return this.devicetypes[type];
  }

  /* HELPER FOR GETTING THE CORRECT DEVICE CONFIG */
  getDeviceConfig(hostname, type = null) {
    try {
      if (type === null) {
        return Util.deviceConfig.find(r => r.hostname.includes(hostname));
      } else {
        return Util.deviceConfig.find(r => r.type.includes(type));
      }
    } catch (error) {
      console.error(error);
    }
  }

  /* HELPER FOR GETTING THE CORRECT ACTION EVENT DESCRIPTION */
  getActionEventDescriptionFlowcard(code) {
    return Util.actionEventsFlowcard[code];
  }

  /* HELPER TO NORMALIZE VALUE */
  normalize(value, min, max) {
    var normalized = (value - min) / (max - min);
    return Number(normalized.toFixed(2));
  }

  /* HELPER TO DENORMALIZE VALUE */
  denormalize(normalized, min, max) {
    var denormalized = (normalized * (max - min) + min);
    return Number(denormalized.toFixed(0));
  }

  /* HELPER TO CLAMP VALUE */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /* HELPER TO GET A RANDOM TIMEOUT VALUE */
  getRandomTimeout(max) {
    return (Math.floor(Math.random() * Math.floor(max)) * 1000);
  }

  /* HELPER TO AWAIT A SLEEP VALUE */
  sleep(ms) {
  	return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* FUNCTION FOR RETURNING A CLOUD WEBSOCKET COMMAND */
  websocketMessage(data) {
    try {
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
    } catch (error) {
      console.error(error);
    }
  }

  /* FUNCTION FOR CHECKING THE STATUS FOR REGULAR HTTP COMMANDS */
  checkStatus = (res) => {
    if (res !== undefined) {
      if (res.status === 200) {
        return res;
      } else {
        switch (res.status) {
          case 400:
            throw new Error(this.homey.__('util.400') +' Error message: '+ res.statusText);
          case 401:
          case 403:
            throw new Error(this.homey.__('util.401') +' Error message: '+ res.statusText);
          case 404:
            throw new Error(this.homey.__('util.404') +' Error message: '+ res.statusText);
          case 500:
            throw new Error(this.homey.__('util.500') +' Error message: '+ res.statusText);
          case 502:
          case 504:
            throw new Error(this.homey.__('util.502') +' Error message: '+ res.statusText);
          default:
            throw new Error(res.status+': '+ this.homey.__('util.unknownerror') +' Error message: '+ res.statusText);
        }
      }
    }
  }

}

module.exports = Util;