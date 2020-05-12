const Homey = require('homey');
const util = require('/lib/util.js');

module.exports = [
	{
		description: 'Shelly App API Callback Events',
		method   : 'GET',
		path     : '/button_actions/:devicetype/:deviceid/:action',
		public   : true,
		fn: function(args, callback) {
      (async () => {    
        let device = await Homey.ManagerDrivers.getDriver(args.params.devicetype).getDevice({'id': args.params.deviceid});

        // EXTRA ACTIONS SHELLY DW
        if (args.params.devicetype == 'shellydw' && !device.getCapabilityValue('alarm_contact') && (args.params.action == 'open_dark' || args.params.action == 'open_twilight')) {
          device.setCapabilityValue('alarm_contact', true);
        } else if (args.params.devicetype == 'shellydw' && device.getCapabilityValue('alarm_contact') && args.params.action == 'close') {
          device.setCapabilityValue('alarm_contact', false);
        }

        // EXTRA ACTIONS SHELLY FLOOD
        if (args.params.devicetype == 'shellyflood' && !device.getCapabilityValue('alarm_water') && args.params.action == 'flood_detected') {
          device.setCapabilityValue('alarm_contact', true);
        } else if (args.params.devicetype == 'shellyflood' && device.getCapabilityValue('alarm_water') && args.params.action == 'flood_gone') {
          device.setCapabilityValue('alarm_water', false);
        }

        device.triggerCallbackEvents(args.params.action);

        callback(false, 'OK');
      })().catch(err => {
        callback(err, false);
      });
		}
	},
  {
		description: 'Shelly App API Status Callbacks',
		method   : 'GET',
		path     : '/report_status/:devicetype/:deviceid',
		public   : true,
		fn: function(args, callback) {
      (async () => {
        console.log(args);
        let device = await Homey.ManagerDrivers.getDriver(args.params.devicetype).getDevice({'id': args.params.deviceid});
        await device.updateReportStatus(device, args.query);
        callback(false, 'OK');
      })().catch(err => {
        callback(err, false);
      });
		}
	}
]
