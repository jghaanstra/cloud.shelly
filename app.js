"use strict";

const Homey = require('homey');
const util = require('/lib/util.js');

class ShellyApp extends Homey.App {

  onInit() {
    this.log('Initializing Shelly App ...');

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
    new Homey.FlowCardCondition('relay0Powered')
      .register()
      .registerRunListener((args, state) => {
        if (args.device.getCapabilityValue('onoff.relay0')) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      })

    new Homey.FlowCardCondition('relay1Powered')
      .register()
      .registerRunListener((args, state) => {
        if (args.device.getCapabilityValue('onoff.relay1')) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      })

    new Homey.FlowCardCondition('relay2Powered')
      .register()
      .registerRunListener((args, state) => {
        if (args.device.getCapabilityValue('onoff.relay2')) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      })

    new Homey.FlowCardCondition('relay3Powered')
      .register()
      .registerRunListener((args, state) => {
        if (args.device.getCapabilityValue('onoff.relay3')) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      })

    new Homey.FlowCardAction('relay0OnAction')
      .register()
      .registerRunListener((args, state) => {
        return util.sendCommand('/relay/0?turn=on', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    new Homey.FlowCardAction('relay1OnAction')
      .register()
      .registerRunListener((args, state) => {
        return util.sendCommand('/relay/1?turn=on', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    new Homey.FlowCardAction('relay2OnAction')
      .register()
      .registerRunListener((args, state) => {
        return util.sendCommand('/relay/2?turn=on', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    new Homey.FlowCardAction('relay3OnAction')
      .register()
      .registerRunListener((args, state) => {
        return util.sendCommand('/relay/3?turn=on', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    new Homey.FlowCardAction('relay0OffAction')
      .register()
      .registerRunListener((args, state) => {
        return util.sendCommand('/relay/0?turn=off', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    new Homey.FlowCardAction('relay1OffAction')
      .register()
      .registerRunListener((args, state) => {
        return util.sendCommand('/relay/1?turn=off', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    new Homey.FlowCardAction('relay2OffAction')
      .register()
      .registerRunListener((args, state) => {
        return util.sendCommand('/relay/2?turn=off', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

    new Homey.FlowCardAction('relay3OffAction')
      .register()
      .registerRunListener((args, state) => {
        return util.sendCommand('/relay/3?turn=off', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
      })

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

    new Homey.FlowCardAction('moveRollerShutter')
      .register()
      .registerRunListener((args, state) => {
        return util.sendCommand('/roller/0?go='+ args.direction +'&duration='+ args.duration +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
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

  }

}

module.exports = ShellyApp;
