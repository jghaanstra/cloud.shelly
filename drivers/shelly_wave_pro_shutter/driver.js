'use strict';

const Homey = require('homey');

class ShellyWaveProShutterDriver extends Homey.Driver {

  onInit() {
    super.onInit();

    this.tiltAction = this.homey.flow.getActionCard('actionWaveShutterTiltSet')
    this.tiltAction.registerRunListener((args, state) => {
      return args.device.actionTiltRunListener(args, state);
    });
  }

}

module.exports = ShellyWaveProShutterDriver;