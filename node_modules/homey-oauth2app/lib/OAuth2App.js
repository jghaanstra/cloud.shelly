'use strict';

const Homey = require('homey');
const OAuth2Error = require('./OAuth2Error');
const OAuth2Token = require('./OAuth2Token');
const OAuth2Client = require('./OAuth2Client');
const OAuth2Util = require('./OAuth2Util');

const SETTINGS_KEY = 'OAuth2Sessions';

const sDebug = Symbol('debug');
const sConfigs = Symbol('configs');
const sClients = Symbol('clients');

/**
 * @extends Homey.App
 * @type {module.OAuth2App}
 * @hideconstructor
 */
class OAuth2App extends Homey.App {

  /** @type {boolean} */
  static OAUTH2_DEBUG = false;
  /** @type {OAuth2Client} */
  static OAUTH2_CLIENT = OAuth2Client;
  /** @type {boolean} */
  static OAUTH2_MULTI_SESSION = false;

  /**
   * We assume all drivers use OAuth2.
   * In some cases, some drivers may never become ready.
   * Make sure to exclude those drivers from this array.
   * @type {string[]}
   */
  static OAUTH2_DRIVERS = Homey.manifest.drivers.map(driver => driver.id);

  /**
   * @returns {Promise<void>}
   */
  async onInit() {
    this[sDebug] = false;
    this[sConfigs] = {};
    this[sClients] = {};

    if (this.constructor.OAUTH2_DEBUG) {
      this.enableOAuth2Debug();
    }

    if (this.constructor.OAUTH2_CLIENT.API_URL
      && this.constructor.OAUTH2_CLIENT.TOKEN_URL) {
      this.setOAuth2Config();
    }

    await this.onOAuth2Init();
  }

  /**
   * @returns {Promise<void>}
   */
  async onOAuth2Init() {
    // Overload Me
  }

  /**
   */
  enableOAuth2Debug() {
    this[sDebug] = true;
  }

  /**
   */
  disableOAuth2Debug() {
    this[sDebug] = false;
  }

  /**
   * Set the app's config.
   * Most apps will only use one config, `default`.
   * All methods default to this config.
   * For apps using multiple clients, a configId can be provided.
   * @param {object} args
   * @param {string} args.configId
   * @param {OAuth2Client} args.client
   * @param {string} args.clientId
   * @param {string} args.clientSecret
   * @param {string} args.apiUrl
   * @param {string} args.token
   * @param {string} args.tokenUrl
   * @param {string} args.authorizationUrl
   * @param {string} args.redirectUrl
   * @param {string[]} args.scopes
   * @param {boolean} args.allowMultiSession
   */
  setOAuth2Config({
    configId = 'default',
    client = this.constructor.OAUTH2_CLIENT,
    clientId = client.CLIENT_ID,
    clientSecret = client.CLIENT_SECRET,
    apiUrl = client.API_URL,
    token = client.TOKEN,
    tokenUrl = client.TOKEN_URL,
    authorizationUrl = client.AUTHORIZATION_URL,
    redirectUrl = client.REDIRECT_URL,
    scopes = client.SCOPES,
    allowMultiSession = this.constructor.OAUTH2_MULTI_SESSION,
  } = {}) {
    if (typeof configId !== 'string') {
      throw new OAuth2Error('Invalid Config ID');
    }

    if (this.hasConfig(configId)) {
      throw new OAuth2Error('Duplicate Config ID');
    }

    if (!client
      || (client !== OAuth2Client && (client.prototype instanceof OAuth2Client) !== true)) {
      throw new OAuth2Error('Invalid Client, must extend OAuth2Client');
    }

    if (!token
      || (token !== OAuth2Token && (token.prototype instanceof OAuth2Token) !== true)) {
      throw new OAuth2Error('Invalid Token, must extend OAuth2Token');
    }

    if (typeof clientId !== 'string') {
      throw new OAuth2Error('Invalid Client ID');
    }

    if (typeof clientSecret !== 'string') {
      throw new OAuth2Error('Invalid Client Secret');
    }

    if (typeof apiUrl !== 'string') {
      throw new OAuth2Error('Invalid API URL');
    }

    if (typeof tokenUrl !== 'string') {
      throw new OAuth2Error('Invalid Token URL');
    }

    if (typeof authorizationUrl !== 'undefined' && authorizationUrl !== null && typeof authorizationUrl !== 'string') {
      throw new OAuth2Error('Invalid Authorization URL');
    }

    if (typeof redirectUrl !== 'string') {
      throw new OAuth2Error('Invalid Redirect URL');
    }

    if (!Array.isArray(scopes)) {
      throw new OAuth2Error('Invalid Scopes Array');
    }

    if (typeof allowMultiSession !== 'boolean') {
      throw new OAuth2Error('Invalid Allow Multi Session');
    }

    this[sConfigs][configId] = {
      token,
      client,
      clientId,
      clientSecret,
      apiUrl,
      tokenUrl,
      authorizationUrl,
      redirectUrl,
      scopes,
      allowMultiSession,
    };
    this[sClients][configId] = {};
  }


  /*
   * OAuth2 Config Management
   * @param {object} args
   * @param {string} args.configId
   * @returns {boolean}
   */
  hasConfig({
    configId = 'default',
  } = {}) {
    return !!this[sConfigs][configId];
  }

  /**
   * @param {object} args
   * @param {string} args.configId
   */
  checkHasConfig({
    configId = 'default',
  } = {}) {
    const hasConfig = this.hasConfig({ configId });
    if (!hasConfig) {
      throw new OAuth2Error('Invalid OAuth2 Config');
    }
  }

  /**
   * @param {object} args
   * @param {string} args.configId
   * @returns {*}
   */
  getConfig({
    configId = 'default',
  } = {}) {
    this.checkHasConfig({ configId });
    return this[sConfigs][configId];
  }

  /*
   * OAuth2 Client Management
   * @param {object} args
   * @param {string} args.sessionId
   * @param {string} args.configId
   * @returns {boolean}
   */
  hasOAuth2Client({
    sessionId,
    configId = 'default',
  } = {}) {
    this.checkHasConfig({ configId });
    return !!this[sClients][configId][sessionId];
  }

  /**
   * @param {object} args
   * @param {string} args.sessionId
   * @param {string} args.configId
   */
  checkHasOAuth2Client({
    sessionId,
    configId = 'default',
  } = {}) {
    const hasClient = this.hasOAuth2Client({ configId, sessionId });
    if (!hasClient) {
      throw new OAuth2Error('Invalid OAuth2 Client');
    }
  }

  /**
   * @param {object} args
   * @param {string} args.sessionId
   * @param {string} args.configId
   * @returns {*}
   */
  createOAuth2Client({
    sessionId,
    configId = 'default',
  } = {}) {
    if (this.hasOAuth2Client({ configId, sessionId })) {
      throw new OAuth2Error('OAuth2 Client already exists');
    }

    const {
      client: Client,
      token,
      clientId,
      clientSecret,
      apiUrl,
      tokenUrl,
      authorizationUrl,
      redirectUrl,
      scopes,
    } = this.getConfig({ configId });

    // eslint-disable-next-line new-cap
    const clientInstance = new Client({
      homey: this.homey,
      token,
      clientId,
      clientSecret,
      apiUrl,
      tokenUrl,
      authorizationUrl,
      redirectUrl,
      scopes,
    });
    this[sClients][configId][sessionId] = clientInstance;
    clientInstance.on('log', (...args) => this.log(`[${clientInstance.constructor.name}] [c:${configId}] [s:${sessionId}]`, ...args));
    clientInstance.on('error', (...args) => this.error(`[${clientInstance.constructor.name}] [c:${configId}] [s:${sessionId}]`, ...args));
    clientInstance.on('debug', (...args) => this[sDebug] && this.log(`[dbg] [${clientInstance.constructor.name}] [c:${configId}] [s:${sessionId}]`, ...args));
    clientInstance.on('save', () => this.saveOAuth2Client({ client: clientInstance, configId, sessionId }));
    clientInstance.on('destroy', () => this.deleteOAuth2Client({ configId, sessionId }));
    clientInstance.init();
    return clientInstance;
  }

  /**
   * @param {object} args
   * @param {string} args.sessionId
   * @param {string} args.configId
   */
  deleteOAuth2Client({
    sessionId,
    configId = 'default',
  } = {}) {
    // remove from storage
    const savedSessions = this.getSavedOAuth2Sessions();
    const savedSession = savedSessions[sessionId];
    if (savedSession
      && savedSession.configId === configId) {
      delete savedSessions[sessionId];
      this.homey.settings.set(SETTINGS_KEY, savedSessions);

      // remove from memory
      delete this[sClients][configId][sessionId];
    }
  }

  /**
   * @param {object} args
   * @param {string} args.sessionId
   * @param {string} args.configId
   * @returns {OAuth2Client}
   */
  getOAuth2Client({
    sessionId,
    configId = 'default',
  } = {}) {
    // if the client for this session has already been initialized, return that
    if (this.hasOAuth2Client({ configId, sessionId })) {
      return this[sClients][configId][sessionId];
    }

    // create a client from storage if available
    const savedSessions = this.getSavedOAuth2Sessions();
    if (savedSessions && savedSessions[sessionId]) {
      let { token } = savedSessions[sessionId];
      const { title } = savedSessions[sessionId];

      const {
        token: Token,
      } = this.getConfig({ configId });

      const client = this.createOAuth2Client({
        sessionId,
        configId,
      });

      if (token) token = new Token(token);

      client.setToken({ token });
      client.setTitle({ title });

      this.tryCleanSession({
        sessionId,
        configId,
      });

      return client;
    }

    throw new OAuth2Error('Could not get OAuth2Client');
  }

  /**
   * @param {object} args
   * @param {string} args.configId
   * @param {string} args.sessionId
   * @param {OAuth2Client} args.client
   */
  saveOAuth2Client({ configId, sessionId, client }) {
    const token = client.getToken();
    const title = client.getTitle();

    const savedSessions = this.getSavedOAuth2Sessions();
    savedSessions[sessionId] = {
      configId,
      title,
      token: (token instanceof OAuth2Token)
        ? token.toJSON()
        : null,
    };
    this.homey.settings.set(SETTINGS_KEY, savedSessions);
  }

  /**
   * @returns {object}
   */
  getSavedOAuth2Sessions() {
    return this.homey.settings.get(SETTINGS_KEY) || {};
  }

  /**
   * @returns {OAuth2Client}
   */
  getFirstSavedOAuth2Client() {
    const sessions = this.getSavedOAuth2Sessions();
    if (Object.keys(sessions).length < 1) {
      throw new OAuth2Error('No OAuth2 Client Found');
    }

    const [sessionId] = Object.keys(sessions);
    const { configId } = sessions[sessionId];

    return this.getOAuth2Client({
      configId,
      sessionId,
    });
  }

  /**
   * @param {object} args
   * @param {string} args.sessionId
   * @param {string} args.configId
   */
  tryCleanSession({
    sessionId,
    configId = 'default',
  }) {
    Promise.resolve().then(async () => {
      const shouldDeleteSession = await this.onShouldDeleteSession({
        sessionId,
        configId,
      });
      if (shouldDeleteSession) {
        this.log(`Deleting session ${configId} ${sessionId}...`);
        this.deleteOAuth2Client({
          sessionId,
          configId,
        });
      }
    }).catch(err => {
      this.homey.error('Error deleting session', err);
    });
  }

  /**
   * @param {object} args
   * @param {string} args.sessionId
   * @param {string} args.configId
   * @returns {Promise<boolean>}
   */
  async onShouldDeleteSession({
    sessionId,
    configId = 'default',
  }) {
    const devices = await this.getOAuth2Devices({
      sessionId,
      configId,
    });

    return devices.length === 0;
  }

  /**
   * @param {object} args
   * @param {string} args.sessionId
   * @param {string} args.configId
   * @returns {Promise<array>}
   */
  async getOAuth2Devices({
    sessionId,
    configId = 'default',
  }) {
    let result = [];

    // Loop drivers from manifest
    // Homey.drivers.getDrivers() may return an incomplete array
    // when the Driver hasn't been initialized yet.
    for (const driverId of this.constructor.OAUTH2_DRIVERS) {
      let driverInstance;

      // Get driver instance when it's ready
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          driverInstance = this.homey.drivers.getDriver(driverId);
          break;
        } catch (err) {
          await OAuth2Util.wait(500);
          continue;
        }
      }

      // Get the driver's devices and find a device
      // that uses this OAuth2Session.
      await driverInstance.ready();
      const devices = driverInstance.getDevices().filter(device => {
        const {
          OAuth2ConfigId,
          OAuth2SessionId,
        } = device.getStore();

        if (OAuth2SessionId === sessionId && OAuth2ConfigId === configId) return true;
        return false;
      });
      result = [...devices, ...result];
    }

    return result;
  }

}

module.exports = OAuth2App;
