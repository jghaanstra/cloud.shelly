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
          util.sendCommand('/relay/0?turn=on&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else {
          util.sendCommand('/relay/0?turn=off&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        }
        return Promise.resolve(true);
      })

    // SHELLY 2
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

    new Homey.FlowCardAction('relay0OnAction')
      .register()
      .registerRunListener((args, state) => {
        util.sendCommand('/relay/0?turn=on', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        return Promise.resolve(true);
      })

    new Homey.FlowCardAction('relay1OnAction')
      .register()
      .registerRunListener((args, state) => {
        util.sendCommand('/relay/1?turn=on', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        return Promise.resolve(true);
      })

    new Homey.FlowCardAction('relay0OffAction')
      .register()
      .registerRunListener((args, state) => {
        util.sendCommand('/relay/0?turn=off', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        return Promise.resolve(true);
      })

    new Homey.FlowCardAction('relay1OffAction')
      .register()
      .registerRunListener((args, state) => {
        util.sendCommand('/relay/1?turn=off', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        return Promise.resolve(true);
      })

    new Homey.FlowCardAction('flipbackSwitch2')
      .register()
      .registerRunListener((args, state) => {
        if (args.switch === '1') {
          util.sendCommand('/relay/'+ args.relay +'?turn=on&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        } else {
          util.sendCommand('/relay/'+ args.relay +'?turn=off&timer='+ args.timer +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        }
        return Promise.resolve(true);
      })

    new Homey.FlowCardAction('moveRollerShutter')
      .register()
      .registerRunListener((args, state) => {
        util.sendCommand('/roller/0?go='+ args.direction +'&duration='+ args.duration +'', args.device.getSetting('address'), args.device.getSetting('username'), args.device.getSetting('password'));
        return Promise.resolve(true);
      })

  }

}

module.exports = ShellyApp;
