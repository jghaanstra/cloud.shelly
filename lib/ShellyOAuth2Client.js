const { OAuth2Client, OAuth2Error } = require('homey-oauth2app');

class ShellyOAuth2Client extends OAuth2Client {

  static API_URL = 'https://';
  static TOKEN_URL = 'https://api.shelly.cloud/oauth/auth';
  static AUTHORIZATION_URL = 'https://my.shelly.cloud/oauth_login.html';
  static SCOPES = [ ];

  async getCloudDevices(server) {
    try {
      return this.get({
        path: server + '/device/all_status?no_shared=true&show_info=true',
        headers: {
          'Accept': 'application/json'
        }
      });
    } catch (error) {
      throw new OAuth2Error(error);
    }
  }

}

module.exports = ShellyOAuth2Client;
