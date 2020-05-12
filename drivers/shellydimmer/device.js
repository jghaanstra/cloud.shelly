'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class ShellyDimmerDevice extends Homey.Device {

  onInit() {
    new Homey.FlowCardTriggerDevice('triggerDimmerInput1').register();
    new Homey.FlowCardTriggerDevice('triggerDimmerInput2').register();
    new Homey.FlowCardTriggerDevice('triggerCallbackEvents').register();

    var interval = this.getSetting('polling') || 5;
    this.pollDevice(interval);
    this.setAvailable();

    // REMOVE DEPRECATED CAPABILITIES
    if (this.hasCapability('button.triggers')) {
      this.removeCapability('button.triggers');
    }
    if (this.hasCapability('button.removetriggers')) {
      this.removeCapability('button.removetriggers');
    }

    // ADD MISSING CAPABILITIES
    if (!this.hasCapability("onoff.input1")) {
      this.addCapability("onoff.input1");
    }
    if (!this.hasCapability("onoff.input2")) {
      this.addCapability("onoff.input2");
    }
    if (!this.hasCapability('button.callbackevents')) {
      this.addCapability('button.callbackevents');
    }
    if (!this.hasCapability('button.removecallbackevents')) {
      this.addCapability('button.removecallbackevents');
    }

    // LISTENERS FOR UPDATING CAPABILITIES
    this.registerCapabilityListener('onoff', (value, opts) => {
      if (value) {
        return util.sendCommand('/light/0?turn=on', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      } else {
        return util.sendCommand('/light/0?turn=off', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      }
    });

    this.registerCapabilityListener('dim', (value, opts) => {
      if (!this.getCapabilityValue('onoff')) {
        this.setCapabilityValue('onoff', true);
      }
      var dim = value * 100;
      return util.sendCommand('/light/0?brightness='+ dim +'', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    });

    this.registerCapabilityListener('button.callbackevents', async () => {
      var homeyip = await util.getHomeyIp();
      var btn1_on_url = '/settings/light/0?btn1_on_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellydimmer/'+ this.getData().id +'/btn1_on/';
      var btn1_off_url = '/settings/light/0?btn1_off_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellydimmer/'+ this.getData().id +'/btn1_off/';
      var btn2_on_url = '/settings/light/0?btn2_on_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellydimmer/'+ this.getData().id +'/btn2_on/';
      var btn2_off_url = '/settings/light/0?btn2_off_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellydimmer/'+ this.getData().id +'/btn2_off/';
      var out_on_url = '/settings/light/0?out_on_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellydimmer/'+ this.getData().id +'/out_on/';
      var out_off_url = '/settings/light/0?out_off_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellydimmer/'+ this.getData().id +'/out_off/';
      var btn1_shortpush_url = '/settings/light/0?btn1_shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellydimmer/'+ this.getData().id +'/btn1_shortpush/';
      var btn1_longpush_url = '/settings/light/0?btn1_longpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellydimmer/'+ this.getData().id +'/btn1_longpush/';
      var btn2_shortpush_url = '/settings/light/0?btn2_shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellydimmer/'+ this.getData().id +'/btn2_shortpush/';
      var btn2_longpush_url = '/settings/light/0?btn2_longpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellydimmer/'+ this.getData().id +'/btn2_longpush/';

      try {
        await util.sendCommand(btn1_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn1_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn2_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn2_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(out_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(out_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn1_shortpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn1_longpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn2_shortpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn2_longpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand('/reboot', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return;
      } catch (error) {
        throw new Error(error);
      }
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      var btn1_on_url = '/settings/light/0?btn1_on_url=null';
      var btn1_off_url = '/settings/light/0?btn1_off_url=null';
      var btn2_on_url = '/settings/light/0?btn2_on_url=null';
      var btn2_off_url = '/settings/light/0?btn2_off_url=null';
      var out_on_url = '/settings/light/0?out_on_url=null';
      var out_off_url = '/settings/light/0?out_off_url=null';
      var btn1_shortpush_url = '/settings/light/0?btn1_shortpush_url=null';
      var btn1_longpush_url = '/settings/light/0?btn1_longpush_url=null';
      var btn2_shortpush_url = '/settings/light/0?btn2_shortpush_url=null';
      var btn2_longpush_url = '/settings/light/0?btn2_longpush_url=null';

      try {
        await util.sendCommand(btn1_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn1_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn2_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn2_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(out_on_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(out_off_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn1_shortpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn1_longpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn2_shortpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn2_longpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return;
      } catch (error) {
        throw new Error(error);
      }
    });

  }

  onDeleted() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);
  }

  // HELPER FUNCTIONS
  pollDevice(interval) {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pollingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          let state = result.lights[0].ison;
          let power = result.meters[0].power;
          let total_consumption = result.meters[0].total;
          let meter_power = total_consumption * 0.000017;
          let dim = Number(result.lights[0].brightness) / 100;
          let temperature = result.tmp.tC;
          let input1 = result.inputs[0].input == 1 ? true : false;
          let input2 = result.inputs[1].input == 1 ? true : false;

          // capability onoff
          if (state != this.getCapabilityValue('onoff')) {
            this.setCapabilityValue('onoff', state);
          }

          // capability measure_power
          if (power != this.getCapabilityValue('measure_power')) {
            this.setCapabilityValue('measure_power', power);
          }

          // capability meter_power_wmin
          if (total_consumption != this.getCapabilityValue('meter_power_wmin')) {
            this.setCapabilityValue('meter_power_wmin', total_consumption);
          }

          // capability meter_power
          if (meter_power != this.getCapabilityValue('meter_power')) {
            this.setCapabilityValue('meter_power', meter_power);
          }

          // capability dim
          if (dim != this.getCapabilityValue('dim')) {
            this.setCapabilityValue('dim', dim);
          }

          // capability measure_temperature
          if (temperature != this.getCapabilityValue('measure_temperature')) {
            this.setCapabilityValue('measure_temperature', temperature);
          }

          // capability onoff.input1
          if (input1 != this.getCapabilityValue('onoff.input1')) {
            this.setCapabilityValue('onoff.input1', input1);
            var status = input1 == true ? "On" : "Off";
            Homey.ManagerFlow.getCard('trigger', 'triggerDimmerInput1').trigger(this, {'status': status}, {});
          }

          // capability onoff.input2
          if (input2 != this.getCapabilityValue('onoff.input2')) {
            this.setCapabilityValue('onoff.input2', input2);
            var status = input2 == true ? "On" : "Off";
            Homey.ManagerFlow.getCard('trigger', 'triggerDimmerInput2').trigger(this, {'status': status}, {});
          }

        })
        .catch(error => {
          this.log(error);
          this.setUnavailable(Homey.__('Unreachable'));
          this.pingDevice();
        })
    }, 1000 * interval);
  }

  pingDevice() {
    clearInterval(this.pollingInterval);
    clearInterval(this.pingInterval);

    this.pingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          this.setAvailable();
          var interval = this.getSetting('polling') || 5;
          this.pollDevice(interval);
        })
        .catch(error => {
          this.log('Device is not reachable, pinging every 63 seconds to see if it comes online again.');
        })
    }, 63000);
  }

  triggerCallbackEvents(action) {
    return Homey.ManagerFlow.getCard('trigger', "triggerCallbackEvents").trigger(this, {"action": action}, {})
  }

}

module.exports = ShellyDimmerDevice;
