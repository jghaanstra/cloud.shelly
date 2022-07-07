'use strict';

class HomeyApp {

  constructor(homey) {
    this.homey = homey;
  }

}

class HomeyDriver {

}

const settings = {};

module.exports = {
  App: HomeyApp,
  Driver: HomeyDriver,
  settings: {
    get: (key) => settings[key],
    set: (key, value) => settings[key] = value,
  },
  manifest: {
    drivers: [
    {
      "name": {
        "en": "LIFX",
        "nl": "LIFX"
      },
      "class": "light",
      "capabilities": [
        "onoff",
        "dim",
        "light_hue",
        "light_saturation",
        "light_temperature",
        "light_mode"
      ],
      "connectivity": [
        "cloud"
      ],
      "platforms": [
        "local",
        "cloud"
      ],
      "capabilitiesOptions": {
        "onoff": {
          "opts": {
            "duration": true
          }
        },
        "dim": {
          "opts": {
            "duration": true
          }
        },
        "light_hue": {
          "opts": {
            "duration": true
          }
        },
        "light_saturation": {
          "opts": {
            "duration": true
          }
        },
        "light_temperature": {
          "opts": {
            "duration": true
          }
        }
      },
      "images": {
        "large": "/drivers/lifx/assets/images/large.png",
        "small": "/drivers/lifx/assets/images/small.png"
      },
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
      ],
      "id": "lifx"
    }
  ],
  },
  env: {
    CLIENT_ID: 'clientid',
    CLIENT_SECRET: 'clientsecret',
  }
};
