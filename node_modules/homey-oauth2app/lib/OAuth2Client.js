'use strict';

const Homey = require('homey');

const { URLSearchParams } = require('url');
const { EventEmitter } = require('events');
const querystring = require('querystring');

const fetch = require('./OAuth2Fetch');

const OAuth2Error = require('./OAuth2Error');
const OAuth2Token = require('./OAuth2Token');
const OAuth2Util = require('./OAuth2Util');

/**
 * @extends EventEmitter
 * @description This class handles all api and token requests, and should be extended by the app.
 * @type {module.OAuth2Client}
 * @hideconstructor
 */
class OAuth2Client extends EventEmitter {

  /** @type {string[]} */
  static CLIENT_ID = Homey.env.CLIENT_ID;

  /** @type {string[]} */
  static CLIENT_SECRET = Homey.env.CLIENT_SECRET;

  /** @type {string} */
  static API_URL = null;

  /** @type {OAuth2Token} */
  static TOKEN = OAuth2Token;

  /** @type {string} */
  static TOKEN_URL = null;

  /** @type {string} */
  static AUTHORIZATION_URL = null;

  /** @type {string} */
  static REDIRECT_URL = 'https://callback.athom.com/oauth2/callback';

  /** @type {string[]} */
  static SCOPES = [];

  /**
   * @param {object} args
   * @param {Homey} args.homey
   * @param {string} args.token
   * @param {string} args.clientId
   * @param {string} args.clientSecret
   * @param {string} args.apiUrl
   * @param {string} args.tokenUrl
   * @param {string} args.authorizationUrl
   * @param {string} args.redirectUrl
   * @param {array} args.scopes
   */
  constructor({
    homey,
    token,
    clientId,
    clientSecret,
    apiUrl,
    tokenUrl,
    authorizationUrl,
    redirectUrl,
    scopes,
  }) {
    super();

    this.homey = homey;

    this._tokenConstructor = token;
    this._clientId = clientId;
    this._clientSecret = clientSecret;
    this._apiUrl = apiUrl;
    this._tokenUrl = tokenUrl;
    this._authorizationUrl = authorizationUrl;
    this._redirectUrl = redirectUrl;
    this._scopes = scopes;

    this._token = null;
  }

  /*
   * Helpers
   */

  /**
   * @description Helper function
   * @returns {Promise<void>}
   */
  init() {
    this.debug('Initialized');
    return this.onInit();
  }

  /**
   * @description Helper function
   * @param props
   */
  log(...props) {
    this.emit('log', ...props);
  }

  /**
   * @description Helper function
   * @param props
   */
  error(...props) {
    this.emit('error', ...props);
  }

  /**
   * @description Helper function
   * @param props
   */
  debug(...props) {
    this.emit('debug', ...props);
  }

  /**
   * @description Helper function
   */
  save() {
    this.emit('save');
  }

  /**
   * @description Helper function
   */
  destroy() {
    this.onUninit().catch(() => { });
    this.emit('destroy');
  }

  /*
   * Request Management
   */

  /**
   * @param {object} args
   * @param {string} args.path
   * @param {string} args.query
   * @param {object} args.headers
   * @returns {Promise<*>}
   */
  async get({
    path,
    query,
    headers,
  }) {
    return this._executeRequest({
      method: 'GET',
      path,
      query,
      headers,
    });
  }

  /**
   * @param {object} args
   * @param {string} args.path
   * @param {string} args.query
   * @param {object} args.headers
   * @returns {Promise<*>}
   */
  async delete({
    path,
    query,
    headers,
  }) {
    return this._executeRequest({
      method: 'delete',
      path,
      query,
      headers,
    });
  }

  /**
   * @param {object} args
   * @param {string} args.path
   * @param {string} args.query
   * @param {object} args.json
   * @param {object} args.body
   * @param {object} args.headers
   * @returns {Promise<*>}
   */
  async post({
    path,
    query,
    json,
    body,
    headers,
  }) {
    return this._executeRequest({
      method: 'POST',
      path,
      query,
      json,
      body,
      headers,
    });
  }

  /**
   * @param {object} args
   * @param {string} args.path
   * @param {string} args.query
   * @param {object} args.json
   * @param {object} args.body
   * @param {object} args.headers
   * @returns {Promise<*>}
   */
  async patch({
    path,
    query,
    json,
    body,
    headers,
  }) {
    return this._executeRequest({
      method: 'PATCH',
      path,
      query,
      json,
      body,
      headers,
    });
  }

  /**
   * @param {object} args
   * @param {string} args.path
   * @param {string} args.query
   * @param {object} args.json
   * @param {object} args.body
   * @param {object} args.headers
   * @returns {Promise<*>}
   */
  async put({
    path,
    query,
    json,
    body,
    headers,
  }) {
    return this._executeRequest({
      method: 'PUT',
      path,
      query,
      json,
      body,
      headers,
    });
  }

  /**
   * @param {object} args
   * @returns {Promise<undefined|void|null>}
   */
  async refreshToken(...args) {
    if (this._refreshingToken) {
      return this._refreshingToken;
    }

    this._refreshingToken = this.onRefreshToken(...args);

    try {
      await this._refreshingToken;
      delete this._refreshingToken;
    } catch (err) {
      delete this._refreshingToken;
      throw err;
    }

    return undefined;
  }


  /**
   * @param {object} args
   * @param args.req
   * @param {boolean} args.didRefreshToken
   * @returns {Promise<void|*>}
   * @private
   */
  async _executeRequest(
    req,
    didRefreshToken = false,
  ) {
    const {
      url,
      opts,
    } = await this.onBuildRequest(req);

    if (this._refreshingToken) {
      await this._refreshingToken;
    }

    // log request
    this.debug('[req]', opts.method, url);
    for (const key of Object.keys(opts.headers)) {
      this.debug('[req]', `${key}: ${opts.headers[key]}`);
    }

    if (opts.body) {
      this.debug('[req]', opts.body);
    }

    // make request
    let response;
    try {
      response = await fetch(url, opts);
    } catch (err) {
      return this.onRequestError({
        req,
        url,
        opts,
        err,
      });
    }
    return this.onRequestResponse({
      req,
      url,
      opts,
      response,
      didRefreshToken,
    });
  }

  /*
   * Token management
   */

  /**
   * @param {object} args
   * @param {string} args.code
   * @returns {Promise<null>}
   */
  async getTokenByCode({ code }) {
    const token = await this.onGetTokenByCode({ code });
    if (!(token instanceof OAuth2Token)) {
      throw new Error('Invalid Token returned in onGetTokenByCode');
    }

    this.setToken({ token });
    return this.getToken();
  }

  /**
   * @param {object} args
   * @param {string} args.username
   * @param {string} args.password
   * @returns {Promise<null>}
   */
  async getTokenByCredentials({ username, password }) {
    const token = await this.onGetTokenByCredentials({ username, password });
    if (!(token instanceof OAuth2Token)) {
      throw new Error('Invalid Token returned in getTokenByCredentials');
    }

    this._token = token;
    return this.getToken();
  }

  /**
   * @returns {string|null}
   */
  getToken() {
    return this._token;
  }

  /**
   * @param {object} args
   * @param {string} args.token
   */
  setToken({ token }) {
    this._token = token;
  }

  /*
   * Various
   */

  /**
   * @param {object} args
   * @param {array} args.scopes
   * @param {string} args.state
   * @returns {string}
   */
  getAuthorizationUrl({
    scopes = this._scopes,
    state = OAuth2Util.getRandomId(),
  } = {}) {
    const url = this.onHandleAuthorizationURL({ scopes, state });
    this.debug('Got authorization URL:', url);
    return url;
  }

  /**
   * @returns {string}
   */
  getTitle() {
    return this._title;
  }

  /**
   * @param {string} title
   */
  setTitle({ title }) {
    this._title = title;
  }

  /*
   * Methods that can be extended
   */

  /**
   * @description Can be extended
   * @returns {Promise<void>}
   */
  async onInit() {
    // Extend me
  }

  /**
   * @description Can be extended
   * @returns {Promise<void>}
   */
  async onUninit() {
    // Extend me
  }

  /**
   * @description Can be extended
   * @param {object} args
   * @param {string} args.method
   * @param {string} args.path
   * @param {object} args.json
   * @param {object} args.body
   * @param {object} args.query
   * @param {object} args.headers
   * @returns {Promise<{opts: object, url: string}>}
   */
  async onBuildRequest({
    method, path, json, body, query, headers = {},
  }) {
    const opts = {};
    opts.method = method;
    opts.headers = headers;
    opts.headers = await this.onRequestHeaders({ headers: opts.headers });

    let urlAppend = '';
    query = await this.onRequestQuery({
      query: {
        ...query,
      },
    });
    if (typeof query === 'object' && Object.keys(query).length) {
      urlAppend = `?${querystring.stringify(query)}`;
    }

    if (json) {
      if (body) {
        throw new OAuth2Error('Both body and json provided');
      }

      opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
      opts.body = JSON.stringify(json);
    } else if (body) {
      opts.body = body;
    }

    let url;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      url = `${path}${urlAppend}`; // Allow the use of absolute URLs to ignore this._apiUrl
    } else {
      url = `${this._apiUrl}${path}${urlAppend}`;
    }

    return {
      url,
      opts,
    };
  }

  /**
   * @description Can be extended
   * @param {object} args
   * @param {string} args.query
   * @returns {Promise<Object>}
   */
  async onRequestQuery({ query }) {
    return query;
  }

  /**
   * @param {object} args
   * @param {object} args.headers
   * @returns {Promise<Object>}
   */
  async onRequestHeaders({ headers }) {
    const token = await this.getToken();
    if (!token) {
      throw new OAuth2Error('Missing Token');
    }

    const { access_token: accessToken } = token;
    return {
      ...headers,
      Authorization: `Bearer ${accessToken}`,
    };
  }

  /**
   * @description Can be extended
   * @description {@link https://tools.ietf.org/html/rfc6749#section-4.1.3}
   * @param {object} args
   * @param {string} args.code
   * @returns {Promise<OAuth2Token>}
   */
  async onGetTokenByCode({ code }) {
    const body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('client_id', this._clientId);
    body.append('client_secret', this._clientSecret);
    body.append('code', code);
    body.append('redirect_uri', this._redirectUrl);

    const response = await fetch(this._tokenUrl, {
      body,
      method: 'POST',
    });
    if (!response.ok) {
      return this.onHandleGetTokenByCodeError({ response });
    }

    this._token = await this.onHandleGetTokenByCodeResponse({ response });
    return this.getToken();
  }

  /**
   * @description Can be extended
   * @param {object} args
   * @param {object} args.response
   * @returns {Promise<void>}
   */
  async onHandleGetTokenByCodeError({ response }) {
    return this._onHandleGetTokenByErrorGeneric({ response });
  }

  /**
   * @description Can be extended
   * @param {object} args
   * @param {object} args.response
   * @returns {Promise<void>}
   */
  async onHandleGetTokenByCodeResponse({ response }) {
    return this._onHandleGetTokenByResponseGeneric({ response });
  }

  /**
   * @description {@link https://tools.ietf.org/html/rfc6749#section-4.3.2}
   * @param {object} args
   * @param {string} args.username
   * @param {string} args.password
   * @returns {Promise<OAuth2Token>}
   */
  async onGetTokenByCredentials({ username, password }) {
    const body = new URLSearchParams();
    body.append('grant_type', 'password');
    body.append('username', username);
    body.append('password', password);
    body.append('scope', this._scopes.join(' '));

    if (this._clientId) {
      body.append('client_id', this._clientId);
    }

    if (this._clientSecret) {
      body.append('client_secret', this._clientSecret);
    }

    const response = await fetch(this._tokenUrl, {
      body,
      method: 'POST',
    });
    if (!response.ok) {
      return this.onHandleGetTokenByCredentialsError({ response });
    }

    this._token = await this.onHandleGetTokenByCredentialsResponse({ response });
    return this.getToken();
  }

  async onHandleGetTokenByCredentialsError({ response }) {
    return this._onHandleGetTokenByErrorGeneric({ response });
  }

  async onHandleGetTokenByCredentialsResponse({ response }) {
    return this._onHandleGetTokenByResponseGeneric({ response });
  }

  /**
   * @description {@link https://tools.ietf.org/html/rfc6749#section-6}
   * @returns {Promise<OAuth2Token>}
   */
  async onRefreshToken() {
    const token = this.getToken();
    if (!token) {
      throw new OAuth2Error('Missing Token');
    }

    this.debug('Refreshing token...');

    if (!token.isRefreshable()) {
      throw new OAuth2Error('Token cannot be refreshed');
    }

    const body = new URLSearchParams();
    body.append('grant_type', 'refresh_token');
    body.append('client_id', this._clientId);
    body.append('client_secret', this._clientSecret);
    body.append('refresh_token', token.refresh_token);

    const response = await fetch(this._tokenUrl, {
      body,
      method: 'POST',
    });
    if (!response.ok) {
      return this.onHandleRefreshTokenError({ response });
    }

    this._token = await this.onHandleRefreshTokenResponse({ response });

    this.debug('Refreshed token!', this._token);
    this.save();

    return this.getToken();
  }

  /**
   * @param {object} args
   * @param {object} args.response
   * @returns {Promise<void>}
   */
  async onHandleRefreshTokenError({ response }) {
    return this._onHandleGetTokenByErrorGeneric({ response });
  }

  /**
   * @param {object} args
   * @param {object} args.response
   * @returns {Promise<OAuth2Token>}
   */
  async onHandleRefreshTokenResponse({ response }) {
    return this._onHandleGetTokenByResponseGeneric({ response });
  }

  /**
   * @param {object} args
   * @param args.response
   * @returns {Promise<void>}
   * @private
   */
  async _onHandleGetTokenByErrorGeneric({ response }) {
    const { headers } = response;
    const contentType = headers.get('Content-Type');
    if (typeof contentType === 'string') {
      if (contentType.startsWith('application/json')) {
        let json;
        try {
          json = await response.json();
        } catch (err) {
          this.debug('Error parsing error body as json:', err);
        }

        if (json && json['error_description']) throw new OAuth2Error(json['error_description'], response.status);
        if (json && json['error']) throw new OAuth2Error(json['error'], response.status);
        if (json && json['message']) throw new OAuth2Error(json['message'], response.status);
        if (json && Array.isArray(json['errors']) && json['errors'].length) {
          const errorStrings = json['errors'].map(error => {
            if (typeof error === 'string') return error;
            if (typeof error === 'object') {
              if (error['error_description']) return error['error_description'];
              if (error['error']) return error['error'];
              if (error['message']) return error['message'];
            }
            return String(error);
          });
          if (errorStrings.length) throw new OAuth2Error(errorStrings.join(', '), response.status);
        }
      }
    }

    throw new Error(`Invalid Response (${response.status} ${response.statusText})`);
  }

  /**
   * @param response
   * @returns {Promise<*>}
   * @private
   */
  async _onHandleGetTokenByResponseGeneric({ response }) {
    const { headers } = response;
    const contentType = headers.get('Content-Type');
    if (typeof contentType === 'string') {
      if (contentType.startsWith('application/json')) {
        const json = await response.json();
        const token = new this._tokenConstructor({
          ...this._token, // merge with old token for properties such as refresh_token
          ...json,
        });
        return token;
      }
    }

    throw new Error('Could not parse Token Response');
  }

  /**
   * @param {object} arg
   * @param {object} arg.err
   * @returns {Promise<void>}
   */
  async onRequestError({ err }) {
    this.debug('onRequestError', err);
    throw err;
  }

  /**
   * @description This method returns a boolean if the response is rate limited
   * @param {object} args
   * @param args.req
   * @param {string} args.url
   * @param {object} args.opts
   * @param args.response
   * @param args.didRefreshToken
   * @returns {Promise<void|*>}
   */
  async onRequestResponse({
    req,
    url,
    opts,
    response,
    didRefreshToken,
  }) {
    const {
      ok,
      status,
      statusText,
      headers,
    } = response;

    this.debug('[res]', {
      ok,
      status,
      statusText,
    });

    const shouldRefreshToken = await this.onShouldRefreshToken(response);
    if (shouldRefreshToken) {
      if (didRefreshToken) {
        throw new OAuth2Error('Token refresh failed');
      } else {
        await this.refreshToken({
          req,
          url,
          opts,
          response,
        });
        return this._executeRequest(
          req,
          true,
        );
      }
    }

    const isRateLimited = await this.onIsRateLimited({
      status,
      headers,
    });
    if (isRateLimited) {
      this.debug('Request is rate limited');
      // TODO: Implement automatic retrying
      throw new OAuth2Error('Rate Limited');
    }

    const result = await this.onHandleResponse({
      response,
      status,
      statusText,
      headers,
      ok,
    });
    return this.onHandleResult({
      result,
      status,
      statusText,
      headers,
    });
  }

  /**
   * @description This method returns a boolean if the token should be refreshed
   * @param {object} args
   * @param args.status
   * @returns {Promise<boolean>}
   */
  async onShouldRefreshToken({ status }) {
    return status === 401;
  }

  /**
   * @description This method returns a boolean if the response is rate limited
   * @param {object} args
   * @param {number} args.status
   * @param {object} args.headers
   * @returns {Promise<boolean>}
   */
  async onIsRateLimited({ status, headers }) {
    return status === 429;
  }

  /**
   * @description This method handles a response and downloads the body
   * @param {object} args
   * @param {object} args.response
   * @param {number} args.status
   * @param {string} args.statusText
   * @param {object} args.headers
   * @param {boolean} args.ok
   * @returns {Promise<*|undefined>}
   */
  async onHandleResponse({
    response,
    status,
    statusText,
    headers,
    ok,
  }) {
    if (status === 204) {
      return undefined;
    }

    let body;

    const contentType = headers.get('Content-Type');
    if (typeof contentType === 'string') {
      if (contentType.startsWith('application/json')) {
        body = await response.json();
      } else if (contentType.startsWith('image/')) {
        body = await response.buffer();
      } else {
        body = await response.text();
      }
    } else {
      body = await response.text();
    }

    if (ok) {
      return body;
    }

    const err = await this.onHandleNotOK({
      body,
      status,
      statusText,
      headers,
    });

    if (!(err instanceof Error)) {
      throw new OAuth2Error('Invalid onHandleNotOK return value, expected: instanceof Error');
    }

    throw err;
  }

  /**
   * @description This method handles a response that is not OK (400 <= statuscode <= 599)
   * @param {object} args
   * @param args.body
   * @param {number} args.status
   * @param {string} args.statusText
   * @param {object} args.headers
   * @returns {Promise<Error>}
   */
  async onHandleNotOK({
    body,
    status,
    statusText,
    headers,
  }) {
    const message = `${status} ${statusText || 'Unknown Error'}`;
    const err = new Error(message);
    err.status = status;
    err.statusText = statusText;
    return err;
  }

  /**
   * @description This method handles a response that is OK
   * @param {object} args
   * @param args.result
   * @param {number} args.status
   * @param {string} args.statusText
   * @param {object} args.headers
   * @returns {Promise<*>}
   */
  async onHandleResult({
    result,
    status,
    statusText,
    headers,
  }) {
    return result;
  }

  /**
   * @param {object} args
   * @param {array.<string>} args.scopes
   * @param {string} args.state
   * @returns {string}
   */
  onHandleAuthorizationURL({ scopes, state } = {}) {
    const query = {
      state,
      client_id: this._clientId,
      response_type: 'code',
      scope: this.onHandleAuthorizationURLScopes({ scopes }),
      redirect_uri: this._redirectUrl,
    };

    if (this._authorizationUrl.includes('?')) {
      return `${this._authorizationUrl}&${querystring.stringify(query)}`;
    }

    return `${this._authorizationUrl}?${querystring.stringify(query)}`;
  }

  /**
   * @description {@link https://tools.ietf.org/html/rfc6749#appendix-A.4}
   * @param {object} args
   * @param {array} args.scopes
   * @returns {*}
   */
  onHandleAuthorizationURLScopes({ scopes }) {
    return scopes.join(' ');
  }

  /**
   * @description This method returns data that can identify the session
   * @returns {Promise<{id: *, title: null}>}
   */
  async onGetOAuth2SessionInformation() {
    return {
      id: OAuth2Util.getRandomId(),
      title: null,
    };
  }

}

module.exports = OAuth2Client;
