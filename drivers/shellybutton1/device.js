'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class ShellyButton1Device extends Homey.Device {

  onInit() {
    this.pollDevice();
    this.setAvailable();

    this.registerCapabilityListener('button.callbackevents', async () => {
      this.addCallbackUrls();
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      var shortpush_url = '/settings/input/0?shortpush_url=null';
      var double_shortpush_url = '/settings/input/0?double_shortpush_url=null';
      var triple_shortpush_url = '/settings/input/0?triple_shortpush_url=null';
      var longpush_url = '/settings/input/0?longpush_url=null';

      try {
        await util.sendCommand(shortpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(double_shortpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(triple_shortpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(longpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));

        return;
      } catch (error) {
        throw new Error(error);
      }
    });
  }

  onAdded() {
    this.addCallbackUrls();
  }

  onDeleted() {
    clearInterval(this.pollingInterval);

    const iconpath = "/userdata/" + this.getData().id +".svg";
    util.removeIcon(iconpath)
      .catch(error => {
        this.log(error);
      });
  }

  // HELPER FUNCTIONS
  pollDevice() {
    clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(() => {
      util.sendCommand('/status', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'))
        .then(result => {
          let battery = result.bat.value;
          let voltage = result.bat.voltage;

          // capability measure_power
          if (battery != this.getCapabilityValue('measure_battery')) {
            this.setCapabilityValue('measure_battery', battery);
          }

          // capability measure_voltage
          if (voltage != this.getCapabilityValue('measure_voltage')) {
            this.setCapabilityValue('measure_voltage', voltage);
          }

        })
        .catch(error => {
          this.log('Device asleep or disconnected');
        })
    }, 4000);
  }

  async addCallbackUrls() {
    var homeyip = await util.getHomeyIp();

    var shortpush_url = '/settings/input/0?shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellybutton1/'+ this.getData().id +'/shortpush/';
    var double_shortpush_url = '/settings/input/0?double_shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellybutton1/'+ this.getData().id +'/double_shortpush/';
    var triple_shortpush_url = '/settings/input/0?triple_shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellybutton1/'+ this.getData().id +'/triple_shortpush/';
    var longpush_url = '/settings/input/0?longpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellybutton1/'+ this.getData().id +'/longpush/';

    try {
      await util.sendCommand(shortpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(double_shortpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(triple_shortpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(longpush_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));

      await util.sendCommand('/reboot', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));

      return;
    } catch (error) {
      throw new Error(error);
    }
  }

}

module.exports = ShellyButton1Device;
