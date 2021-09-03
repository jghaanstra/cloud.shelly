'use strict';

const Homey = require('homey');
const Util = require('../lib/util.js');
const WebSocket = require('ws');
const tinycolor = require("tinycolor2");

class ShellyDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});
  }

  // HELPER FUNCTIONS

  /* boot sequence */
  async bootSequence() {
    try {
      if (this.getStoreValue('communication') === 'cloud') {
        // nothing to do here
      } else if (this.getStoreValue('communication') === 'websocket') {
        if (this.getStoreValue('channel') === 0) {
          this.ws = null;
          this.connected = false;
          this.commandId = 0;
          this.connectWebsocket();
        }
        setTimeout(() => {
          this.pollWebsocketDevice();
        }, this.util.getRandomTimeout(10));
        if ((this.getStoreValue('channel') === 0 || this.getStoreValue('channel') == null) && this.getStoreValue('battery') !== true) {
          this.pollingInterval = setInterval(() => {
            this.pollWebsocketDevice();
          }, 60000);
        } else {
          this.pollingInterval = setInterval(() => {
            this.pollWebsocketDevice();
          }, (60000 + (1000 * this.getStoreValue('channel'))));
        }
      } else {
        if (this.homey.settings.get('general_coap')) { /* CoAP is disabled */
          if (this.getStoreValue('channel') === 0 || this.getStoreValue('channel') == null) {
            this.pollingInterval = setInterval(() => {
              this.pollDevice();
            }, this.homey.settings.get('general_polling_frequency') * 1000 || 5000);
          } else {
            this.pollingInterval = setInterval(() => {
              setTimeout(async () => {
                await this.pollDevice();
              }, this.getStoreValue('channel') * 1500);
            }, this.homey.settings.get('general_polling_frequency') * 1000 || 5000);
          }
        } else { /* CoAP is enabled */
          setTimeout(() => {
            this.pollDevice();
          }, this.util.getRandomTimeout(10));
          if ((this.getStoreValue('channel') === 0 || this.getStoreValue('channel') == null) && this.getStoreValue('battery') !== true) {
            this.pollingInterval = setInterval(() => {
              this.pollDevice();
            }, 60000);
          } else {
            this.pollingInterval = setInterval(() => {
              this.pollDevice();
            }, (60000 + (1000 * this.getStoreValue('channel'))));
          }
        }
      }
    } catch (error) {
      this.log(error);
    }
  }

  /* updating capabilities */
  async updateCapabilityValue(capability, value, channel = 0) {
    try {
      if (channel === 0) {
        if (value != this.getCapabilityValue(capability)) {
          this.setCapabilityValue(capability, value);
        }
      } else {
        const device_id = this.getStoreValue('main_device') + '-channel-' + channel;
        const device = this.driver.getDevice({id: device_id });
        device.updateCapabilityValue(capability, value);
      }
    } catch (error) {
      this.log('Trying to update capability', capability, 'with value', value, 'for device', this.getData().id);
      this.log(error);
    }
  }

  /* polling local devices over HTTP REST API */
  async pollDevice() {
    try {
      var result = await this.util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      if (!this.getAvailable()) { this.setAvailable(); }
      this.parseStatusUpdate(result);
    } catch (error) {
      if (!this.getStoreValue('battery')) {
        this.setUnavailable(this.homey.__('device.unreachable') + error.message);
        this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": this.getName(), "device_error": error.message});
        this.log(error);
      } else {
        this.log(this.getData().id +' is probably asleep and disconnected');
      }
    }
  }

  /* generic status updates parser for polling over local HTTP REST API and websockets cloud */
  async parseStatusUpdate(result) {
    try {
      let channel = this.getStoreValue('channel') || 0;

      // RELAYS (onoff)
      if (result.hasOwnProperty("relays") && this.hasCapability('onoff')) {

        if (result.relays.hasOwnProperty([channel])) {
          this.updateCapabilityValue('onoff', result.relays[channel].ison);
        }

      }

      // METERS (measure_power, meter_power)
      if (result.hasOwnProperty("meters")) {

        if (result.meters.hasOwnProperty([channel])) {
          /* measure_power */
          if (result.meters[channel].hasOwnProperty("power") && this.hasCapability('measure_power')) {
            this.updateCapabilityValue('measure_power', result.meters[channel].power);
          }
          /* meter_power */
          if (result.meters[channel].hasOwnProperty("total") && this.hasCapability('meter_power')) {
            let meter_power_meter = result.meters[channel].total * 0.000017;
            this.updateCapabilityValue('meter_power', meter_power_meter);
          }
        }

      }

      // EMETERS (measure_power, meter_power, meter_power_returned, power_factor, measure_current, measure_voltage)
      if (result.hasOwnProperty("emeters")) {

        if (result.emeters.hasOwnProperty([channel])) {

          /* measure_power */
          if (result.emeters[channel].hasOwnProperty("power") && this.hasCapability('measure_power')) {
            this.updateCapabilityValue('measure_power', result.emeters[channel].power);
          }

          /* meter_power */
          if (result.emeters[channel].hasOwnProperty("total") && this.hasCapability('meter_power')) {
            let meter_power_emeter = result.emeters[channel].total / 1000;
            this.updateCapabilityValue('meter_power', meter_power_emeter);
          }

          /* meter_power_returned */
          if (result.emeters[channel].hasOwnProperty("total_returned") && this.hasCapability('meter_power_returned')) {
            let meter_power_returned = result.emeters[channel].total_returned / 1000;
            let meter_power_returned_rounded = Number(meter_power_returned.toFixed(3));
            this.updateCapabilityValue('meter_power_returned', meter_power_returned_rounded);
          }

          /* power factor */
          if (result.emeters[channel].hasOwnProperty("pf") && this.hasCapability('meter_power_factor')) {
            this.updateCapabilityValue('meter_power_returned', result.emeters[channel].pf);
          }

          /* measure_current */
          if (result.emeters[channel].hasOwnProperty("current")  && this.hasCapability('measure_current')) {
            this.updateCapabilityValue('measure_current', result.emeters[channel].current);
          }

          /* measure_voltage */
          if (result.emeters[channel].hasOwnProperty("voltage")  && this.hasCapability('measure_voltage')) {
            this.updateCapabilityValue('measure_voltage', result.emeters[channel].voltage);
          }

        }

      }

      // BAT (measure_battery)
      if (result.hasOwnProperty("bat")) {

        /* measure_battery */
        if (result.bat.hasOwnProperty("value") && this.hasCapability('measure_battery')) {
          this.updateCapabilityValue('measure_battery', result.bat.value);
        }

      }

      // TMP (measure_temperature)
      if (result.hasOwnProperty("tmp")) {

        /* measure_temperature */
        if (result.tmp.hasOwnProperty("value") && this.hasCapability('measure_temperature')) {
          this.updateCapabilityValue('measure_temperature', result.tmp.value);
        }

        /* measure_temperature */
        if (result.tmp.hasOwnProperty("tC") && this.hasCapability('measure_temperature')) {
          this.updateCapabilityValue('measure_temperature', result.tmp.tC);
        }

      }

      // TEMPERATURE (measure_temperature)
      if (result.hasOwnProperty("temperature") && this.hasCapability('measure_temperature')) {

        /* measure_temperature */
        this.updateCapabilityValue('measure_temperature', result.temperature);

      }

      // ROLLERS (windowcoverings_state, windowcoverings_set)
      if (result.hasOwnProperty("rollers")) {

        /* windowcoverings_state */
        if (result.rollers[channel].hasOwnProperty("state")) {
          this.rollerState(result.rollers[channel].state);
        }

        /* windowcoverings_set */
        if (result.rollers[channel].hasOwnProperty("current_pos")) {
          this.rollerPosition(result.rollers[channel].current_pos);
        }

      }

      // LIGHTS
      if (result.hasOwnProperty("lights")) {

        if (result.lights.hasOwnProperty([channel])) {

          /* onoff */
          if (result.lights[channel].hasOwnProperty("ison") && this.hasCapability('onoff')) {
            this.updateCapabilityValue('onoff', result.lights[channel].ison);
          }

          /* light_mode */
          if (result.lights[channel].hasOwnProperty("mode") && this.hasCapability('light_mode')) {
            var light_mode = result.lights[channel].mode === 'white' ? 'temperature' : 'color';
            if (light_mode != this.getCapabilityValue('light_mode') && this.getStoreValue('type') !== 'SHRGBW2') {
              this.updateCapabilityValue('light_mode', light_mode);
            }
          } else {
            var light_mode = 'temperature';
          }

          // Shelly DUO
          if (this.getStoreValue('type') === 'SHBDUO-1') {

            /* dim */
            let dim_duo = result.lights[channel].brightness > 100 ? 1 : result.lights[channel].brightness / 100;
            this.updateCapabilityValue('dim', dim_duo);

            /* light_temperature */
            let light_temperature_duo = 1 - (result.lights[channel].white / 100);
            this.updateCapabilityValue('light_temperature', light_temperature_duo);

          }

          // Shelly Bulb (RGB)
          if (this.getStoreValue('type') === 'SHBLB-1' || this.getStoreValue('type') === 'SHCB-1') {

            /* dim */
            if (light_mode === 'color') {
              var dim_bulb = result.lights[channel].gain > 100 ? 1 : result.lights[channel].gain / 100;
            } else {
              var dim_bulb = result.lights[channel].brightness > 100 ? 1 : result.lights[channel].brightness / 100;
            }
            this.updateCapabilityValue('dim', dim_bulb);

            /* light_temperature_temp */
            let light_temperature_bulb = 1 - Number(this.util.normalize(result.lights[channel].temp, 3000, 6500));
            this.updateCapabilityValue('light_temperature', light_temperature_bulb);

          }

          // Shelly RGBW2
          if (this.getStoreValue('type') === 'SHRGBW2') {

            /* dim and light_temperature in color mode */
            if (result.lights[channel].mode === 'color') {
              let dim_rgbw2color = result.lights[channel].gain > 100 ? 1 : result.lights[channel].gain / 100;
              this.updateCapabilityValue('dim', dim_rgbw2color);

              let light_temperature_rgbw2 = 1 - Number(this.util.normalize(result.lights[channel].white, 0, 255));
              this.updateCapabilityValue('light_temperature', light_temperature_rgbw2);

              if (result.lights[channel].white > 125 && !this.getCapabilityValue('onoff.whitemode')) {
                this.updateCapabilityValue('onoff.whitemode', true);
              } else if (result.lights[channel].white <= 125 && this.getCapabilityValue('onoff.whitemode')) {
                this.updateCapabilityValue('onoff.whitemode', false);
              }
            }

            /* dim white mode */
            if (result.lights[channel].mode === 'white') {
              let dim_rgbwwhite = result.lights[channel].brightness > 100 ? 1 : result.lights[channel].brightness / 100;
              this.updateCapabilityValue('dim', dim_rgbwwhite);
            }

          }

          /* light_hue & light_saturation */
          if (light_mode === 'color') {
            this.setStoreValue('red', result.lights[channel].red);
            this.setStoreValue('green', result.lights[channel].green);
            this.setStoreValue('blue', result.lights[channel].blue);

            let color = tinycolor({r: result.lights[channel].red, g: result.lights[channel].green, b: result.lights[channel].blue});
            let hsv = color.toHsv();
            let light_hue = Number((hsv.h / 360).toFixed(2));

            // capability light_hue
            this.updateCapabilityValue('light_hue', light_hue);

            // capability light_saturation
            this.updateCapabilityValue('light_saturation', hsv.s);

          }

        }

      }

      // SENSOR (alarm_motion, alarm_tamper, alarm_contact)
      if (result.hasOwnProperty("sensor")) {

        /* alarm_motion */
        if (result.sensor.hasOwnProperty("motion") && this.hasCapability('alarm_motion')) {
          this.updateCapabilityValue('alarm_motion', result.sensor.motion);
        }

        /* alarm_tamper */
        if (result.sensor.hasOwnProperty("vibration") && this.hasCapability('alarm_tamper')) {
          this.updateCapabilityValue('alarm_tamper', result.sensor.vibration);
        }

        /* alarm_contact */
        if (result.sensor.hasOwnProperty("state") && this.hasCapability('alarm_contact')) {
          let alarm_contact = result.sensor.state === 'open' ? true : false;
          this.updateCapabilityValue('alarm_contact', alarm_contact);
        }

      }

      // LUX (measure_luminance)
      if (result.hasOwnProperty("lux") && this.hasCapability('measure_luminance')) {

        /* measure_luminance */
        if (result.lux.hasOwnProperty("value")) {
          this.updateCapabilityValue('measure_luminance', result.lux.value);
        }

      }

      // ACCEL (alarm_tamper, tilt)
      if (result.hasOwnProperty("accel")) {

        /* alarm_tamper */
        if (result.accel.hasOwnProperty("vibration") && this.hasCapability('alarm_tamper')) {
          let alarm_tamper_accel = result.accel.vibration === 1 ? true : false;
          this.updateCapabilityValue('alarm_tamper', alarm_tamper_accel);
        }

        /* tilt */
        if (result.accel.hasOwnProperty("tilt") && this.hasCapability('tilt')) {
          this.updateCapabilityValue('tilt', result.accel.tilt);
        }

      }

      // FLOOD (alarm_water)
      if (result.hasOwnProperty("flood") && this.hasCapability('alarm_water')) {

        /* alarm_water */
        this.updateCapabilityValue('alarm_water', result.flood);

      }

      // GAS (alarm_smoke, gas_concentration)
      if (result.hasOwnProperty("gas_sensor") && this.hasCapability('alarm_smoke') && this.hasCapability('gas_concentration')) {

        /* alarm_smoke */
        if (result.gas_sensor.alarm_state == 'mild' || result.gas_sensor.alarm_state == 'heavy') {
          var alarm_gas = true;
        } else {
          var alarm_gas = false;
        }
        this.updateCapabilityValue('alarm_smoke', alarm_gas);

        /* concentration */
        this.updateCapabilityValue('gas_concentration', Number(result.concentration.ppm));

      }

      // SMOKE (alarm_smoke)
      if (result.hasOwnProperty("smoke") && this.hasCapability('alarm_smoke')) {

        /* alarm_smoke */
        this.updateCapabilityValue('alarm_smoke', result.smoke);

      }

      // HUM (measure_humidity)
      if (result.hasOwnProperty("hum") && this.hasCapability('measure_humidity')) {

        /* measure_humidity */
        if (result.hum.hasOwnProperty("value")) {
          this.updateCapabilityValue('measure_humidity', result.hum.value);
        }

      }

      // ADCS (measure_voltage)
      if (result.hasOwnProperty("adcs") && this.hasCapability('measure_voltage') && this.getStoreValue('channel') === 0) {

        /* measure_voltage */
        if (result.adcs.hasOwnProperty([0])) {
          if (result.adcs[0].hasOwnProperty("voltage")) {
            this.updateCapabilityValue('measure_voltage', result.adcs[0].voltage);
          }
        }
      }

      // INPUTS (input_1, input_2, input_3)
      if (result.hasOwnProperty("inputs")) {

        /* input_1 */
        if (result.inputs.hasOwnProperty([0]) && this.hasCapability('input_1')) {
          let input_1 = result.inputs[0].input == 1 ? true : false;
          if (input_1 != this.getCapabilityValue('input_1')) {
            this.updateCapabilityValue('input_1', input_1);
            if (input_1) {
              this.homey.flow.getDeviceTriggerCard('triggerInput1On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInput1Off').trigger(this, {}, {});
            }
          }

          // input/action event for cloud devices
          if (this.getStoreValue('communication') === 'cloud' && result.inputs[0].event_cnt > 0 && (result.inputs[0].event_cnt > this.getStoreValue('event_cnt')) && result.inputs[0].event) {
            if (this.hasCapability('input_1') && this.hasCapability('input_2')) {
              var action0 = this.util.getActionEventDescription(result.inputs[0].event) + '_1';
            } else {
              var action0 = this.util.getActionEventDescription(result.inputs[0].event);
            }
            this.setStoreValue('event_cnt', result.inputs[0].event_cnt);
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action0 }, {"id": this.getData().id, "device": this.getName(), "action": action0 });
          }
        }

        /* input_2 */
        if (result.inputs.hasOwnProperty([1])) {
          if (this.hasCapability('input_2')) {
            let input_2 = result.inputs[1].input == 1 ? true : false;
            if (input_2 != this.getCapabilityValue('input_2')) {
              this.updateCapabilityValue('input_2', input_2);
              if (input_2) {
                this.homey.flow.getDeviceTriggerCard('triggerInput2On').trigger(this, {}, {});
              } else {
                this.homey.flow.getDeviceTriggerCard('triggerInput2Off').trigger(this, {}, {});
              }
            }
            // input/action events for cloud devices
            if (this.getStoreValue('communication') === 'cloud' && result.inputs[1].event_cnt > 0 && (result.inputs[1].event_cnt > this.getStoreValue('event_cnt')) &&result.inputs[1].event) {
              var action1 = this.util.getActionEventDescription(result.inputs[1].event) + '_2';
              this.setStoreValue('event_cnt', result.inputs[1].event_cnt);
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action1 }, {"id": this.getData().id, "device": this.getName(), "action": action1 });
            }
          } else {
            let input_2 = result.inputs[1].input == 1 ? true : false;
            if (input_2 != this.getCapabilityValue('input_1')) {
              this.updateCapabilityValue('input_1', input_2);
              if (input_2) {
                this.homey.flow.getDeviceTriggerCard('triggerInput1On').trigger(this, {}, {});
              } else {
                this.homey.flow.getDeviceTriggerCard('triggerInput1Off').trigger(this, {}, {});
              }
            }
            // input/action events for cloud devices
            if (this.getStoreValue('communication') === 'cloud' && result.inputs[1].event_cnt > 0 && (result.inputs[1].event_cnt > this.getStoreValue('event_cnt')) && result.inputs[1].event) {
              var action1 = this.util.getActionEventDescription(result.inputs[1].event);
              this.setStoreValue('event_cnt', result.inputs[1].event_cnt);
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action1 }, {"id": this.getData().id, "device": this.getName(), "action": action1 });
            }
          }
        }

        /* input_3 */
        if (result.inputs.hasOwnProperty([2]) && this.hasCapability('input_3')) {
          let input_3 = result.inputs[2].input == 1 ? true : false;
          if (input_3 != this.getCapabilityValue('input_3')) {
            this.updateCapabilityValue('input_3', input_3);
            if (input_3) {
              this.homey.flow.getDeviceTriggerCard('triggerInput3On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInput3Off').trigger(this, {}, {});
            }
          }

          // input/action events for cloud devices
          if (this.getStoreValue('communication') === 'cloud' && result.inputs[2].event_cnt > 0 && (result.inputs[2].event_cnt > this.getStoreValue('event_cnt')) && result.inputs[2].event) {
            const action2 = await this.util.getActionEventDescription(result.inputs[2].event) + '_3';
            this.setStoreValue('event_cnt', result.inputs[2].event_cnt);
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": action2 }, {"id": this.getData().id, "device": this.getName(), "action": action2 });
          }
        }

      }

      // EXT_TEMPERATURE (measure_temperature.1, measure_temperature.2, measure_temperature.3)
      if (result.hasOwnProperty("ext_temperature")) {

        /* measure_temperature.1 */
        if (result.ext_temperature.hasOwnProperty([0]) && !this.hasCapability('measure_temperature.1') && this.getStoreValue('channel') === 0) {
          this.addCapability('measure_temperature.1');
        } else if (result.ext_temperature.hasOwnProperty([0]) && this.hasCapability('measure_temperature.1')) {
          let temp1 = result.ext_temperature[0].tC;
          if (temp1 != this.getCapabilityValue('measure_temperature.1')) {
            this.updateCapabilityValue('measure_temperature.1', temp1);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature1').trigger(this, {'temperature': temp1}, {});
          }
        }

        /* measure_temperature.2 */
        if (result.ext_temperature.hasOwnProperty([1]) && !this.hasCapability('measure_temperature.2') && this.getStoreValue('channel') === 0) {
          this.addCapability('measure_temperature.2');
        } else if (result.ext_temperature.hasOwnProperty([1]) && this.hasCapability('measure_temperature.2')) {
          let temp2 = result.ext_temperature[1].tC;
          if (temp2 != this.getCapabilityValue('measure_temperature.2')) {
            this.updateCapabilityValue('measure_temperature.2', temp2);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature2').trigger(this, {'temperature': temp2}, {});
          }
        }

        /* measure_temperature.3 */
        if (result.ext_temperature.hasOwnProperty([2]) && !this.hasCapability('measure_temperature.3') && this.getStoreValue('channel') === 0) {
          this.addCapability('measure_temperature.3');
        } else if (result.ext_temperature.hasOwnProperty([2]) && this.hasCapability('measure_temperature.3')) {
          let temp3 = result.ext_temperature[2].tC;
          if (temp3 != this.getCapabilityValue('measure_temperature.3')) {
            this.updateCapabilityValue('measure_temperature.3', temp3);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature3').trigger(this, {'temperature': temp3}, {});
          }
        }

      }

      // EXT_SWITCH
      if (result.hasOwnProperty("ext_switch")) {
        if (result.ext_switch.hasOwnProperty([0]) && !this.hasCapability('input_external')) {
          this.addCapability('input_external');
        } else if (result.ext_switch.hasOwnProperty([0]) && this.hasCapability('input_external')) {
          let input_external = result.ext_switch[0].input === 0 ? false : true;
          if (input_external != this.getCapabilityValue('input_external')) {
            this.updateCapabilityValue('input_external', input_external);
            if (input_external) {
              this.homey.flow.getDeviceTriggerCard('triggerInputExternal1On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInputExternal1Off').trigger(this, {}, {});
            }
          }
        }
      }

      // EXT_HUMIDITY
      if (result.hasOwnProperty("ext_humidity")) {

        /* measure_humidity */
        if (result.ext_humidity.hasOwnProperty([0]) && !this.hasCapability('measure_humidity')) {
          this.addCapability('measure_humidity');
        } else if (result.ext_humidity.hasOwnProperty([0]) && this.hasCapability('measure_humidity')) {
          this.updateCapabilityValue('measure_humidity', result.ext_humidity[0].hum);
        }

      }

      // firmware update available?
      if (result.hasOwnProperty("update")) {
        if (result.update.has_update === true && (this.getStoreValue('latest_firmware') !== result.update.new_version)) {
          this.homey.flow.getTriggerCard('triggerFWUpdate').trigger({"id": this.getData().id, "device": this.getName(), "firmware": result.update.new_version});
          this.setStoreValue("latest_firmware", result.update.new_version);
        }
      }

      // update unicast
      if (this.getStoreValue('communication') === 'coap' && !this.getStoreValue('unicast') === true && this.getStoreValue('battery') === false && this.getStoreValue('type') !== 'SHSW-44') {
        const result = await this.util.setUnicast(this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        if (result === 'OK') {
          this.setStoreValue("unicast", true);
        }
      }

    } catch (error) {
      if (!this.getStoreValue('battery')) {
        this.setUnavailable(this.homey.__('device.unreachable') + error.message);
        this.homey.flow.getTriggerCard('triggerDeviceOffline').trigger({"device": this.getName(), "device_error": error.message});
        this.log(error);
      } else {
        this.log(this.getData().id +' is probably asleep and disconnected');
      }
    }
  }

  /* polling gen2 websocket devices */
  async pollWebsocketDevice() { }

  /* websocket for gen2 devices */
  async connectWebsocket() { }

  /* process capability updates from CoAP and gen2 websocket devices */
  async parseCapabilityUpdate(capability, value, channel = 0) {
    try {
      if (!this.getAvailable()) { this.setAvailable(); }

      // update unicast for battery devices
      if (this.getStoreValue('battery') === true && !this.getStoreValue('unicast') === true) {
        const result = await this.util.setUnicast(this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        if (result === 'OK') {
          this.setStoreValue("unicast", true);
        }
      }

      switch(capability) {
        case 'output':
        case 'relay0':
        case 'relay1':
        case 'relay2':
        case 'relay3':
        case 'switch':
        case 'switch0':
        case 'switch1':
        case 'switch2':
        case 'switch3':
          this.updateCapabilityValue('onoff', value, channel);
          break;
        case 'apower':
        case 'power0':
        case 'power1':
        case 'power2':
        case 'power3':
          this.updateCapabilityValue('measure_power', value, channel);
          break;
        case 'energyCounter0':
        case 'energyCounter1':
        case 'energyCounter2':
        case 'energyCounter3':
          if (this.getStoreValue('type') === 'SHEM' || this.getStoreValue('type') === 'SHEM-3') {
            var meter_power = value / 1000;
          } else {
            var meter_power = value * 0.000017;
          }
          this.updateCapabilityValue('meter_power', meter_power, channel);
          break;
        case 'energyReturned0':
        case 'energyReturned1':
        case 'energyReturned2':
          let meter_power_returned = value / 1000;
          let meter_power_returned_rounded = Number(meter_power_returned.toFixed(3));
          if (meter_power_returned_rounded != this.getCapabilityValue('meter_power_returned')) {
            this.updateCapabilityValue('meter_power_returned', meter_power_returned_rounded, channel);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerReturned').trigger(this, {'energy': meter_power_returned_rounded}, {});
          }
          break;
        case 'powerFactor0':
        case 'powerFactor1':
        case 'powerFactor2':
          if (value != this.getCapabilityValue('meter_power_factor')) {
            this.updateCapabilityValue('meter_power_factor', value, channel);
            this.homey.flow.getDeviceTriggerCard('triggerMeterPowerFactor').trigger(this, {'pf': value}, {});
          }
          break;
        case 'current0':
        case 'current1':
        case 'current2':
          this.updateCapabilityValue('measure_current', value, channel);
          break;
        case 'voltage0':
        case 'voltage1':
        case 'voltage2':
          this.updateCapabilityValue('measure_voltage', value, channel);
          break;
        case 'overPower':
        case 'overPower0':
        case 'overPower1':
          if (value) {
            this.homey.flow.getDeviceTriggerCard('triggerOverpowered').trigger(this, {}, {});
          }
          break;
        case 'battery':
          this.updateCapabilityValue('measure_battery', value, channel);
          break;
        case 'tC':
        case 'deviceTemperature':
        case 'temperature':
          this.updateCapabilityValue('measure_temperature', value, channel);
          break;
        case 'rollerState':
          this.rollerState(value);
          break;
        case 'rollerPosition':
          this.rollerPosition(value);
          break;
        case 'gain':
        case 'brightness':
        case 'brightness0':
        case 'brightness1':
        case 'brightness2':
        case 'brightness3':
          let dim = value >= 100 ? 1 : value / 100;
          this.updateCapabilityValue('dim', dim, channel);
          break;
        case 'mode':
          let light_mode = value === 'white' ? 'temperature' : 'color';
          this.updateCapabilityValue('light_mode', light_mode, channel);
          break;
        case 'colorTemperature':
          if (this.getStoreValue('type') === 'SHBDUO-1') {
            value = value === 0 ? 2700 : value;
            var light_temperature = 1 - Number(this.util.normalize(value, 2700, 6500)); // Shelly Duo
          } else {
            value = value === 0 ? 3000 : value;
            var light_temperature = 1 - Number(this.util.normalize(value, 3000, 6500)); // Shelly Bulb
          }
          this.updateCapabilityValue('light_temperature', light_temperature, channel);
          break;
        case 'whiteLevel':
          let light_temperature_whitelevel = 1 - value / 100;
          this.updateCapabilityValue('light_temperature', light_temperature_whitelevel, channel);
          break;
        case 'white':
          let light_temperature_white = 1 - Number(this.util.normalize(value, 0, 255));
          this.updateCapabilityValue('light_temperature', light_temperature_white, channel);
          if (value > 220 && !this.getCapabilityValue('onoff.whitemode')) {
            this.setCapabilityValue('onoff.whitemode', true);
            this.setCapabilityValue('light_mode', 'temperature');
          } else if (value >= 0 && value <= 220 && this.getCapabilityValue('onoff.whitemode')) {
            this.setCapabilityValue('onoff.whitemode', false);
            this.setCapabilityValue('light_mode', 'color');
          }
          break;
        case 'red':
          this.setStoreValue('red', value);
          this.updateDeviceRgb();
          break;
        case 'green':
          this.setStoreValue('green', value);
          this.updateDeviceRgb();
          break;
        case 'blue':
          this.setStoreValue('blue', value);
          this.updateDeviceRgb();
          break;
        case 'motion':
          value = value === 1 || value ? true : false;
          this.updateCapabilityValue('alarm_motion', value, channel);
          break;
        case 'vibration':
          value = value === 1 || value ? true : false;
          this.updateCapabilityValue('alarm_tamper', value, channel);
          break;
        case 'state':
          value = value === 1 || value ? true : false;
          this.updateCapabilityValue('alarm_contact', value, channel);
          break;
        case 'flood':
          value = value === 1 || value ? true : false;
          this.updateCapabilityValue('alarm_water', value, channel);
          break;
        case 'tilt':
          if (value != this.getCapabilityValue('tilt')) {
            this.updateCapabilityValue('tilt', value, channel);
            this.homey.flow.getDeviceTriggerCard('triggerTilt').trigger(this, {'tilt': value}, {});
          }
          break;
        case 'illuminance':
          this.updateCapabilityValue('measure_luminance', value, channel);
          break;
        case 'gas':
          if (value === 'mild' || value === 'heavy') {
            var alarm = true;
          } else {
            var alarm = false;
          }
          this.updateCapabilityValue('alarm_smoke', alarm, channel);
          break;
        case 'concentration':
          if (value != this.getCapabilityValue('gas_concentration')) {
            this.updateCapabilityValue('gas_concentration', value, channel);
            this.homey.flow.getDeviceTriggerCard('triggerGasConcentration').trigger(this, {'ppm': value}, {})
          }
          break;
        case 'smoke':
          value = value === 1 || value ? true : false;
          this.updateCapabilityValue('alarm_smoke', value, channel);
          break;
        case 'input0':
          let input_1 = value === 0 ? false : true;
          if (input_1 !== this.getCapabilityValue('input_1')) {
            this.updateCapabilityValue('input_1', input_1, channel);
            if (input_1) {
              this.homey.flow.getDeviceTriggerCard('triggerInput1On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInput1Off').trigger(this, {}, {});
            }
            this.homey.flow.getDeviceTriggerCard('triggerInput1Changed').trigger(this, {}, {});
          }
          break;
        case 'input1':
          if (!this.hasCapability('input_2')) {
            let input_1_1 = value === 0 ? false : true;
            if (input_1_1 !== this.getCapabilityValue('input_1')) {
              this.updateCapabilityValue('input_1', input_1_1, channel);
              if (input_1_1) {
                this.homey.flow.getDeviceTriggerCard('triggerInput1On').trigger(this, {}, {});
              } else {
                this.homey.flow.getDeviceTriggerCard('triggerInput1Off').trigger(this, {}, {});
              }
              this.homey.flow.getDeviceTriggerCard('triggerInput1Changed').trigger(this, {}, {});
            }
          } else {
            let input_2 = value === 0 ? false : true;
            if (input_2 !== this.getCapabilityValue('input_2')) {
              this.updateCapabilityValue('input_2', input_2, channel);
              if (input_2) {
                this.homey.flow.getDeviceTriggerCard('triggerInput2On').trigger(this, {}, {});
              } else {
                this.homey.flow.getDeviceTriggerCard('triggerInput2Off').trigger(this, {}, {});
              }
              this.homey.flow.getDeviceTriggerCard('triggerInput2Changed').trigger(this, {}, {});
            }
          }
          break;
        case 'input2':
          let input_3 = value === 0 ? false : true;
          if (input_3 != this.getCapabilityValue('input_3')) {
            this.updateCapabilityValue('input_3', input_3, channel);
            if (input_3) {
              this.homey.flow.getDeviceTriggerCard('triggerInput3On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInput3Off').trigger(this, {}, {});
            }
            this.homey.flow.getDeviceTriggerCard('triggerInput3Changed').trigger(this, {}, {});
          }
          break;
        case 'inputEvent0':
          if (this.hasCapability('input_1') && this.hasCapability('input_2')) {
            let actionEvent1 = this.util.getActionEventDescription(value) + '_1';
            this.setStoreValue('actionEvent1', actionEvent1);
          } else {
            let actionEvent1 = this.util.getActionEventDescription(value);
            this.setStoreValue('actionEvent', actionEvent1);
          }
          break;
        case 'inputEvent1':
          if (this.hasCapability('input_1') && this.hasCapability('input_2')) {
            let actionEvent2 = this.util.getActionEventDescription(value) + '_2';
            this.setStoreValue('actionEvent2', actionEvent2);
          } else {
            let actionEvent2 = this.util.getActionEventDescription(value);
            this.setStoreValue('actionEvent', actionEvent2);
          }
          break;
        case 'inputEvent2':
          let actionEvent3 = this.util.getActionEventDescription(value) + '_3';
          this.setStoreValue('actionEvent3', actionEvent3);
          break;
        case 'inputEventCounter0':
          if (this.hasCapability('input_1') && this.hasCapability('input_2')) {
            if (value > 0) {
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent1')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent1')});
            }
          } else {
            if (value > 0) {
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')});
            }
          }
          break;
        case 'inputEventCounter1':
          if (this.hasCapability('input_1') && this.hasCapability('input_2')) {
            if (value > 0) {
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent2')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent2')});
            }
          } else {
            if (value > 0) {
              this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent')});
            }
          }
          break;
        case 'inputEventCounter2':
          if (value > 0) {
            this.homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent3')}, {"id": this.getData().id, "device": this.getName(), "action": this.getStoreValue('actionEvent3')});
          }
          break;
        case 'externalTemperature0':
          if (value != this.getCapabilityValue('measure_temperature.1')) {
            this.updateCapabilityValue('measure_temperature.1', value, channel);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature1').trigger(this, {'temperature': value}, {});
          }
          break;
        case 'externalTemperature1':
          if (value != this.getCapabilityValue('measure_temperature.2')) {
            this.updateCapabilityValue('measure_temperature.2', value, channel);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature2').trigger(this, {'temperature': value}, {});
          }
          break;
        case 'externalTemperature2':
          if (value != this.getCapabilityValue('measure_temperature.3')) {
            this.updateCapabilityValue('measure_temperature.3', value, channel);
            this.homey.flow.getDeviceTriggerCard('triggerTemperature3').trigger(this, {'temperature': value}, {});
          }
          break;
        case 'externalInput0':
          let input_external = value === 0 ? false : true;
          if (input_external != this.getCapabilityValue('input_external')) {
            this.updateCapabilityValue('input_external', input_external, channel);
            if (input_external) {
              this.homey.flow.getDeviceTriggerCard('triggerInputExternal1On').trigger(this, {}, {});
            } else {
              this.homey.flow.getDeviceTriggerCard('triggerInputExternal1Off').trigger(this, {}, {});
            }
          }
          break;
        case 'humidity':
        case 'externalHumidity':
          this.updateCapabilityValue('measure_humidity', value, channel);
          break;
        case 'rollerStopReason':
        case 'wakeUpEvent':
          break;
        default:
          //this.log('Device does not support reported capability '+ capability +' with value '+ value);
      }
      return Promise.resolve(true);
    } catch(error) {
      this.log(error);
      return Promise.reject(error);
    }
  }

  updateDeviceRgb() {
    try {
      clearTimeout(this.updateDeviceRgbTimeout);
      this.updateDeviceRgbTimeout = setTimeout(() => {
        let color = tinycolor({ r: this.getStoreValue('red'), g: this.getStoreValue('green'), b: this.getStoreValue('blue') });
        let hsv = color.toHsv();
        let light_hue = Number((hsv.h / 360).toFixed(2));
        this.updateCapabilityValue('light_hue', light_hue);
        this.updateCapabilityValue('light_saturation', hsv.v);
      }, 2000);
    } catch (error) {
      this.log(error);
    }
  }

  rollerState(value) {
    try {
      switch(value) {
        case 'stop':
          var windowcoverings_state = 'idle'
          break;
        case 'open':
          var windowcoverings_state = 'up';
          break;
        case 'close':
          var windowcoverings_state = 'down';
          break;
        default:
          var windowcoverings_state = value;
      }
      if (windowcoverings_state !== 'idle' && windowcoverings_state !== this.getStoreValue('last_action')) {
        this.setStoreValue('last_action', windowcoverings_state);
      }
      this.updateCapabilityValue('windowcoverings_state', windowcoverings_state);
    } catch (error) {
      this.log(error);
    }
  }

  rollerPosition(value) {
    try {
      var windowcoverings_set = value >= 100 ? 1 : value / 100;
      if (this.getSetting('halfway') !== 0.5) {
        if (windowcoverings_set < this.getSetting('halfway')) {
          windowcoverings_set = 0.5 * windowcoverings_set / this.getSetting('halfway');
        } else {
          windowcoverings_set = windowcoverings_set - (1 - (windowcoverings_set - this.getSetting('halfway')) * (1 / (1 - this.getSetting('halfway')))) * (this.getSetting('halfway') - 0.5);
        };
      };
      this.updateCapabilityValue('windowcoverings_set', windowcoverings_set);
    } catch (error) {
      this.log(error);
    }
  }

  getCommandId() {
    return this.commandId++
  }

}

module.exports = ShellyDevice;
