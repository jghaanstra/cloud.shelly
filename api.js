const Homey = require('homey');
const util = require('/lib/util.js');

module.exports = [
	{
		description: 'Shelly App API',
		method   : 'GET',
		path     : '/shelly/:device/:channel/:action',
		public   : true,
		fn: function(args, callback) {
      callback(false, 'OK');
		}
	}
]
