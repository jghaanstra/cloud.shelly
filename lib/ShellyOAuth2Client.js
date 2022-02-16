const { OAuth2Client } = require('homey-oauth2app');

class ShellyOAuth2Client extends OAuth2Client {

  static API_URL = 'https://';
  static TOKEN_URL = 'https://api.shelly.cloud/oauth/auth';
  static AUTHORIZATION_URL = 'https://my.shelly.cloud/oauth_login.html';
  static SCOPES = [ ];

  async getCloudDevices(server) {
    return this.get({
      path: server + '/device/all_status?no_shared=true&show_info=true',
      headers: {
        'Accept': 'application/json'
      }
    });
  }

}

module.exports = ShellyOAuth2Client;
