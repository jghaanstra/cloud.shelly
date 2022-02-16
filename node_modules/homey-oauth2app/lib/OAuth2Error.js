'use strict';

/**
 * @extends Error
 * @type {module.OAuth2Error}
 */
class OAuth2Error extends Error {

  /**
   * @returns {string}
   */
  toString() {
    return `[OAuth2Error] ${super.toString()}`;
  }

}

module.exports = OAuth2Error;
