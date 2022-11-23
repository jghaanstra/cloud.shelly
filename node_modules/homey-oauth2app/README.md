<header>

# Homey OAuth2
[![npm](https://img.shields.io/npm/v/homey-oauth2app)](https://www.npmjs.com/package/homey-oauth2app) [![Lint](https://github.com/athombv/node-homey-oauth2app/actions/workflows/lint.yml/badge.svg?branch=master)](https://github.com/athombv/node-homey-oauth2app/actions/workflows/lint.yml) [![NPM](https://github.com/athombv/node-homey-oauth2app/actions/workflows/deploy.yml/badge.svg)](https://github.com/athombv/node-homey-oauth2app/actions/workflows/deploy.yml) [![Deploy Documentation To GitHub Pages](https://github.com/athombv/node-homey-oauth2app/actions/workflows/docs.yml/badge.svg?branch=master)](https://github.com/athombv/node-homey-oauth2app/actions/workflows/docs.yml)

</header>

This module does the heavy lifting for a [Homey App](https://developer.athom.com) that talks to any OAuth2 Web API.

This module requires Homey Apps SDK v3.

## Documentation

Documentation is available at [https://athombv.github.io/node-homey-oauth2app/](https://athombv.github.io/node-homey-oauth2app/).

## Related Modules

* [node-homey-zwavedriver](https://athombv.github.io/node-homey-zwavedriver) — Module for Z-Wave drivers
* [node-homey-zigbeedriver](https://athombv.github.io/node-homey-zigbeedriver) — Module for Zigbee drivers
* [node-homey-rfdriver](https://athombv.github.io/node-homey-oauth2app) — Module for RF (433 Mhz, 868 MHz, Infrared) drivers
* [node-homey-log](https://athombv.github.io/node-homey-log) — Module to log unhandled errors to Sentry

## Installation

```
$ npm install homey-oauth2app
```

## Usage

### App

In your `/app.js`, make your `Homey.App` extend `OAuth2App`:

```javascript
const { OAuth2App } = require('homey-oauth2app');
const MyBrandOAuth2Client = require('./lib/MyBrandOAuth2Client');

module.exports = class MyBrandApp extends OAuth2App {

  static OAUTH2_CLIENT = MyBrandOAuth2Client; // Default: OAuth2Client
  static OAUTH2_DEBUG = true; // Default: false
  static OAUTH2_MULTI_SESSION = false; // Default: false
  static OAUTH2_DRIVERS = [ 'my_driver' ]; // Default: all drivers

  async onOAuth2Init() {
    // Do App logic here
  }

}
```

### API Client

Then create a file `/lib/MyBrandOAuth2Client` and make it extend `OAuth2Client`:

```javascript
const { OAuth2Client, OAuth2Error } = require('homey-oauth2app');
const MyBrandOAuth2Token = require('./MyBrandOAuth2Token');

module.exports = class MyBrandOAuth2Client extends OAuth2Client {

  // Required:
  static API_URL = 'https://api.mybrand.com/v1';
  static TOKEN_URL = 'https://api.mybrand.com/oauth2/token';
  static AUTHORIZATION_URL = 'https://auth.mybrand.com';
  static SCOPES = [ 'my_scope' ];

  // Optional:
  static TOKEN = MyBrandOAuth2Token; // Default: OAuth2Token
  static REDIRECT_URL = 'https://callback.athom.com/oauth2/callback'; // Default: 'https://callback.athom.com/oauth2/callback'

  // Overload what needs to be overloaded here

  async onHandleNotOK({ body }) {
      throw new OAuth2Error(body.error);
  }

  async getThings({ color }) {
    return this.get({
      path: '/things',
      query: { color },
    });
  }

  async updateThing({ id, thing }) {
    return this.put({
      path: `/thing/${id}`,
      json: { thing },
    });
  }

}
```

By default, `OAuth2Client` will work with any API that follows [RFC 6749](https://tools.ietf.org/html/rfc6749). In case your API differs, there are many methods you can overload to change the behavior.

All methods starting with `on` (for example `onRequestError`) are meant to be overloaded. Overloading any other method might break in the future, so be careful.

### Driver

Add this to your `/drivers/<driver_id>/driver.compose.json`:

```json
{
  "id": "my_driver",
  "pair": [
    {
      "id": "login_oauth2",
      "template": "login_oauth2"
    },
    {
      "id": "list_devices",
      "template": "list_devices",
      "navigation": {
        "next": "add_devices"
      }
    },
    {
      "id": "add_devices",
      "template": "add_devices"
    }
  ],
  "repair": [
    {
      "id": "login_oauth2",
      "template": "login_oauth2"
    }
  ]
}
```

Your `/drivers/<driver_id>/driver.js` should look like this:

```javascript
const { OAuth2Driver } = require('homey-oauth2app');

module.exports = class MyBrandDriver extends OAuth2Driver {

  async onOAuth2Init() {
    // Register Flow Cards etc.
  }

  async onPairListDevices({ oAuth2Client }) {
    const things = await oAuth2Client.getThings({ color: 'red' });
    return things.map(thing => {
      return {
        name: thing.name,
        data: {
          id: thing.id,
        },
      }
    });
  }

}
```

### Device

Finally, your `/drivers/<driver_id>/device.js` should look like this:

```javascript
const { OAuth2Device } = require('homey-oauth2app');

module.exports = class MyBrandDevice extends OAuth2Device {

  async onOAuth2Init() {
    await this.oAuth2Client.getThingState()
      .then(async state => {
        await this.setCapabilityValue('onoff', !!state.on);
      });
  }

  async onOAuth2Deleted() {
    // Clean up here
  }

}
```
