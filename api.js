const Homey = require('homey');
const util = require('/lib/util.js');

module.exports = [
	{
		description: 'Shelly App API',
		method   : 'GET',
		path     : '/shelly/:devicetype/:deviceid/:channel/:action',
		public   : true,
		fn: function(args, callback) {
      console.log(args);

      // todo: built logic to handle incoming updates once Shelly firmware actually supports this.

      callback(false, 'OK');
		}
	}
]
