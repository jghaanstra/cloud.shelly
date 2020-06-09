"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class ShellyApp extends Homey.App {

  onInit() {
    this.log('Initializing Shelly App ...');

    // GENERIC
    new Homey.FlowCardAction('actionReboot')
      .register()
      .registerRunListener((args, state) => {
        return util.sendCommand('/reboot', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    // SHELLY 1
    new Homey.FlowCardAction('flipbackSwitch')
      .register()
      .registerRunListener((args, state) => {
        if (args.switch === '1') {
          return util.sendCommand('/relay/0?turn=on&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else {
          return util.sendCommand('/relay/0?turn=off&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        }
      })

    // SHELLY 2 & SHELLY 4 PRO
    new Homey.FlowCardAction('flipbackSwitch2')
      .register()
      .registerRunListener((args, state) => {
        if (args.switch === '1') {
          return util.sendCommand('/relay/'+ args.relay +'?turn=on&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else {
          return util.sendCommand('/relay/'+ args.relay +'?turn=off&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        }
      })

    new Homey.FlowCardAction('flipbackSwitch4')
      .register()
      .registerRunListener((args, state) => {
        if (args.switch === '1') {
          return util.sendCommand('/relay/'+ args.relay +'?turn=on&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else {
          return util.sendCommand('/relay/'+ args.relay +'?turn=off&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        }
      })

    // SHELLY RGBW2 COLOR
    new Homey.FlowCardAction('flipbackSwitchRGBW2Color')
      .register()
      .registerRunListener((args, state) => {
        if (args.switch === '1') {
          return util.sendCommand('/color/0?turn=on&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else {
          return util.sendCommand('/color/0?turn=off&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        }
      })

    new Homey.FlowCardAction('effectRGBW2Color')
      .register()
      .registerRunListener((args, state) => {
        return util.sendCommand('/color/0?turn=on&effect='+ Number(args.effect) +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    // SHELLY 2(.5) ROLLER SHUTTER
    new Homey.FlowCardAction('moveRollerShutter')
      .register()
      .registerRunListener((args, state) => {
        return util.sendCommand('/roller/0?go='+ args.direction +'&duration='+ args.move_duration +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    new Homey.FlowCardAction('moveRollerShutterOffset')
      .register()
      .registerRunListener((args, state) => {
        return util.sendCommand('/roller/0?go='+ args.direction +'&offset='+ args.offset +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    // SHELLY DIMMER
    new Homey.FlowCardCondition('conditionDimmerInput1')
      .register()
      .registerRunListener((args, state) => {
        if (args.device) {
          return args.device.getCapability("onoff.input1");
        } else {
          return false;
        }
      })

    new Homey.FlowCardCondition('conditionDimmerInput2')
      .register()
      .registerRunListener((args, state) => {
        if (args.device) {
          return args.device.getCapability("onoff.input2");
        } else {
          return false;
        }
      })

    new Homey.FlowCardAction('actionRGBW2EnableWhiteMode')
      .register()
      .registerRunListener((args, state) => {
        return args.device.triggerCapabilityListener("onoff.whitemode", true);
      })

    new Homey.FlowCardAction('actionRGBW2DisableWhiteMode')
      .register()
      .registerRunListener((args, state) => {
        return args.device.triggerCapabilityListener("onoff.whitemode", false);
      })

    // SHELLY DUO
    new Homey.FlowCardAction('actionDuoDimTemperature')
      .register()
      .registerRunListener((args, state) => {
        try {
          let light_temperature = 1 - Number(util.normalize(args.light_temperature, 2700, 6500));

          args.device.triggerCapabilityListener("dim", args.brightness);
          args.device.triggerCapabilityListener("light_temperature", light_temperature);
          return Promise.resolve(true);
        } catch (error) {
          return Promise.reject(error);
        }
      })

  }

}

module.exports = ShellyApp;
