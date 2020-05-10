'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class ShellyFloodDevice extends Homey.Device {

  onInit() {
    new Homey.FlowCardTriggerDevice('triggerCallbackEvents').register();

    this.setAvailable();

    // ADD MISSING CAPABILITIES
    if (!this.hasCapability('button.callbackevents')) {
      this.addCapability('button.callbackevents');
    }
    if (!this.hasCapability('button.removecallbackevents')) {
      this.addCapability('button.removecallbackevents');
    }

    this.registerCapabilityListener('button.callbackevents', async () => {
      var homeyip = await util.getHomeyIp();
      var flood_detected_url = '/settings/?flood_detected_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyflood/'+ this.getData().id +'/flood_detected/';
      var flood_gone_url = '/settings/?flood_gone_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyflood/'+ this.getData().id +'/flood_gone/';
      var report_url = '/settings/?report_url=http://'+ homeyip +'/api/app/cloud.shelly/report_status/shellyflood/'+ this.getData().id +'/';

      try {
        await util.sendCommand(flood_detected_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(flood_gone_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(report_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return;
      } catch (error) {
        throw new Error(error);
      }
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      var flood_detected_url = '/settings?flood_detected_url=null';
      var flood_gone_url = '/settings?flood_gone_url=null';
      var report_url = '/settings?report_url=null';

      try {
        await util.sendCommand(flood_detected_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(flood_gone_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        return;
      } catch (error) {
        throw new Error(error);
      }
    });
  }

  async onAdded() {
    var homeyip = await util.getHomeyIp();
    var report_url = '/settings/?report_url=http://'+ homeyip +'/api/app/cloud.shelly/report_status/shellyflood/'+ this.getData().id +'/';

    try {
      await util.sendCommand(report_url, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      return;
    } catch (error) {
      this.log(error);
    }
  }

  onDeleted() {
    
  }

  // HELPER FUNCTIONS
  triggerCallbackEvents(action) {
    return Homey.ManagerFlow.getCard('trigger', "triggerCallbackEvents").trigger(this, {"action": action}, {})
  }

  updateReportStatus(device, status) {
    var alarm = Number(status.flood) == 0 ? false : true;

    // capability alarm_water
    if (alarm != device.getCapabilityValue('alarm_water')) {
      device.setCapabilityValue('alarm_water', alarm);
    }

    // capability measure_temperature
    if (Number(status.temp) != device.getCapabilityValue('measure_temperature')) {
      device.setCapabilityValue('measure_temperature', Number(status.temp));
    }

    // capability measure_voltage
    if (Number(status.batV) != this.getCapabilityValue('measure_voltage')) {
      this.setCapabilityValue('measure_voltage', Number(status.batV));
    }

    /* needed because report_url does not report battery value */
    util.sendCommand('/status', device.getSetting('address'), device.getSetting('username'), device.getSetting('password'))
      .then(result => {
        let battery = result.bat.value;

        // capability measure_power
        if (battery != this.getCapabilityValue('measure_battery')) {
          this.setCapabilityValue('measure_battery', battery);
        }

      })
      .catch(error => {
        this.log(error);
      })

    return true;
  }

}

module.exports = ShellyFloodDevice;
