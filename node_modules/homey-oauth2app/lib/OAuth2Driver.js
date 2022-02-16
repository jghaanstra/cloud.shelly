'use strict';

const Homey = require('homey');
const OAuth2Util = require('./OAuth2Util');
const OAuth2Error = require('./OAuth2Error');

const sOAuth2ConfigId = Symbol('oAuth2ConfigId');

/**
 * @class OAuth2Driver
 * @extends Homey.Driver
 * @type {module.OAuth2Driver}
 * @hideconstructor
 */
class OAuth2Driver extends Homey.Driver {

  static OAUTH2_CONFIG_ID = 'default';

  /**
   * @returns {Promise<void>}
   */
  async onInit() {
    this.setOAuth2ConfigId(this.constructor.OAUTH2_CONFIG_ID);
    await this.onOAuth2Init();
  }

  /**
   * @description
   * > This method can be extended
   * @returns {Promise<void>}
   */
  async onOAuth2Init() {
    // Extend me
  }

  /**
   * @returns {*}
   */
  getOAuth2ConfigId() {
    return this[sOAuth2ConfigId];
  }

  /**
   * @param {string} id
   */
  setOAuth2ConfigId(id) {
    if (typeof id !== 'string') {
      throw new OAuth2Error('Invalid Config ID');
    }

    this[sOAuth2ConfigId] = id;
  }

  /**
   * @param {PairSession} socket
   */
  onPair(socket) {
    const OAuth2ConfigId = this.getOAuth2ConfigId();
    let OAuth2SessionId = '$new';
    let currentViewId = 'list_sessions';
    let client = this.homey.app.createOAuth2Client({
      sessionId: OAuth2Util.getRandomId(),
      configId: OAuth2ConfigId,
    });

    const OAuth2Config = this.homey.app.getConfig({
      configId: OAuth2ConfigId,
    });
    const { allowMultiSession } = OAuth2Config;
    if (!allowMultiSession) {
      const savedSessions = this.homey.app.getSavedOAuth2Sessions();
      if (Object.keys(savedSessions).length) {
        OAuth2SessionId = Object.keys(savedSessions)[0];
        try {
          client = this.homey.app.getOAuth2Client({
            configId: OAuth2ConfigId,
            sessionId: OAuth2SessionId,
          });
          this.log(`Multi-Session disabled. Selected ${OAuth2SessionId} as active session.`);
        } catch (err) {
          this.error(err);
        }
      }
    }

    const onShowViewLoginCredentials = () => {
      if (OAuth2SessionId !== '$new') {
        socket.nextView().catch(this.error);
      }
    };

    const onLogin = async ({ username, password }) => {
      await client.getTokenByCredentials({ username, password });
      const session = await client.onGetOAuth2SessionInformation();

      OAuth2SessionId = session.id;
      const token = client.getToken();
      const { title } = session;
      client.destroy();

      // replace the temporary client by the final one and save it
      client = this.homey.app.createOAuth2Client({
        sessionId: session.id,
        configId: OAuth2ConfigId,
      });
      client.setTitle({ title });
      client.setToken({ token });

      return true;
    };

    /**
     * @returns {Promise<void>}
     */
    const onShowViewLoginOAuth2 = async () => {
      if (OAuth2SessionId !== '$new') {
        socket.emit('authorized').catch(this.error);
        return;
      }

      try {
        const oAuth2AuthorizationUrl = client.getAuthorizationUrl();
        const oAuth2Callback = await this.homey.cloud.createOAuth2Callback(oAuth2AuthorizationUrl);
        oAuth2Callback
          .on('url', url => {
            socket.emit('url', url).catch(this.error);
          })
          .on('code', code => {
            client.getTokenByCode({ code })
              .then(async () => {
                // get the client's session info
                const session = await client.onGetOAuth2SessionInformation();
                OAuth2SessionId = session.id;
                const token = client.getToken();
                const { title } = session;
                client.destroy();

                // replace the temporary client by the final one and save it
                client = this.homey.app.createOAuth2Client({
                  sessionId: session.id,
                  configId: OAuth2ConfigId,
                });
                client.setTitle({ title });
                client.setToken({ token });

                socket.emit('authorized').catch(this.error);
              })
              .catch(err => {
                socket.emit('error', err.message || err.toString()).catch(this.error);
              });
          });
      } catch (err) {
        socket.emit('error', err.message || err.toString()).catch(this.error);
      }
    };

    const onShowView = async viewId => {
      currentViewId = viewId;
      if (viewId === 'login_oauth2') {
        onShowViewLoginOAuth2();
      } else if (viewId === 'login_credentials') {
        onShowViewLoginCredentials();
      }
    };

    const onListSessions = async () => {
      if (!allowMultiSession) {
        throw new Error('Multi-Session is disabled.\nPlease remove the list_devices from your App\'s manifest or allow Multi-Session support.');
      }

      const savedSessions = this.homey.app.getSavedOAuth2Sessions();
      const result = Object.keys(savedSessions).map((sessionId, i) => {
        const session = savedSessions[sessionId];
        return {
          name: session.title || `Saved User ${i + 1}`,
          data: { id: sessionId },
        };
      });

      result.push({
        name: 'New User',
        data: {
          id: '$new',
        },
      });

      return result;
    };

    const onListSessionsSelection = async ([selection]) => {
      if (!allowMultiSession) {
        throw new Error('Multi-Session is disabled.');
      }

      const { id } = selection.data;

      OAuth2SessionId = id;
      this.log(`Selected session ${OAuth2SessionId}`);

      if (OAuth2SessionId !== '$new') {
        client = this.homey.app.getOAuth2Client({
          configId: OAuth2ConfigId,
          sessionId: OAuth2SessionId,
        });
      }
    };

    const onListDevices = async data => {
      if (currentViewId === 'list_sessions') {
        return onListSessions(data);
      }

      const devices = await this.onPairListDevices({
        oAuth2Client: client,
      });

      return devices.map(device => {
        return {
          ...device,
          store: {
            ...device.store,
            OAuth2SessionId,
            OAuth2ConfigId,
          },
        };
      });
    };

    const onAddDevice = async () => {
      this.log('At least one device has been added, saving the client...');
      client.save();
    };

    const onDisconnect = async () => {
      this.log('Pair Session Disconnected');
    };

    socket
      .setHandler('showView', onShowView)
      .setHandler('login', onLogin)
      .setHandler('list_sessions', onListSessions)
      .setHandler('list_sessions_selection', onListSessionsSelection)
      .setHandler('list_devices', onListDevices)
      .setHandler('add_device', onAddDevice)
      .setHandler('disconnect', onDisconnect);
  }

  /**
   * @description
   * > This method can be extended
   * @returns {Promise<*>}
   */
  async onPairListDevices() {
    // Extend me
    return [];
  }

  /**
   * @param {PairSession} socket
   * @param {Homey.Device} device
   */
  onRepair(socket, device) {
    let client;

    let {
      OAuth2SessionId,
      OAuth2ConfigId,
    } = device.getStore();

    if (!OAuth2SessionId) {
      OAuth2SessionId = OAuth2Util.getRandomId();
    }

    if (!OAuth2ConfigId) {
      OAuth2ConfigId = this.getOAuth2ConfigId();
    }

    // Get the Device's OAuth2Client
    // Or create it when it doesn't exist
    try {
      client = this.homey.app.getOAuth2Client({
        sessionId: OAuth2SessionId,
        configId: OAuth2ConfigId,
      });
    } catch (err) {
      client = this.homey.app.createOAuth2Client({
        sessionId: OAuth2SessionId,
        configId: OAuth2ConfigId,
      });
    }

    const onShowViewLoginOAuth2 = async () => {
      try {
        const oAuth2AuthorizationUrl = client.getAuthorizationUrl();
        const oAuth2Callback = await this.homey.cloud.createOAuth2Callback(oAuth2AuthorizationUrl);
        oAuth2Callback
          .on('url', url => {
            socket.emit('url', url).catch(this.error);
          })
          .on('code', code => {
            client.getTokenByCode({ code })
              .then(async () => {
                await device.onOAuth2Uninit();
                await device.setStoreValue('OAuth2SessionId', OAuth2SessionId);
                await device.setStoreValue('OAuth2ConfigId', OAuth2ConfigId);
                await client.save();
                device.oAuth2Client = client;
                await device.onOAuth2Init();

                socket.emit('authorized').catch(this.error);
              })
              .catch(err => {
                socket.emit('error', err.message || err.toString()).catch(this.error);
              });
          });
      } catch (err) {
        socket.emit('error', err.message || err.toString()).catch(this.error);
      }
    };

    const onShowView = async viewId => {
      if (viewId === 'login_oauth2') {
        await onShowViewLoginOAuth2();
      }
    };

    const onDisconnect = async () => {
      this.log('Pair Session Disconnected');
    };

    socket
      .setHandler('showView', onShowView)
      .setHandler('disconnect', onDisconnect);
  }

}

module.exports = OAuth2Driver;
