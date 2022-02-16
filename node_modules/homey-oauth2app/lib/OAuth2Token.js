/* eslint-disable camelcase */

'use strict';

/**
 * @type {module.OAuth2Token}
 */
class OAuth2Token {

  /**
   * @param {object} args
   * @param args.access_token
   * @param args.refresh_token
   * @param args.token_type
   * @param args.expires_in
   */
  constructor({
    access_token,
    refresh_token,
    token_type,
    expires_in,
  }) {
    this.access_token = access_token || null;
    this.refresh_token = refresh_token || null;
    this.token_type = token_type || null;
    this.expires_in = expires_in || null;
  }

  /**
   * @returns {boolean}
   */
  isRefreshable() {
    return !!this.refresh_token;
  }

  /**
   * @returns {
   *  {access_token: (*|null), refresh_token: (*|null), token_type: (*|null), expires_in: (*|null)}
   * }
   */
  toJSON() {
    return {
      access_token: this.access_token,
      refresh_token: this.refresh_token,
      token_type: this.token_type,
      expires_in: this.expires_in,
    };
  }

}

module.exports = OAuth2Token;
