'use strict';
const googleapis = require('googleapis');
const merge = require('lodash.merge');

const COMMENT_ANALYZER_DISCOVERY_URL = 'https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1';

class Perspective {
  constructor(options) {
    this.options = options || {};
    if (!this.options.apiKey) {
      throw new Error('Must provide options.apiKey');
    }
    this._client = null;
  }
  analyze(text, options = {}) {
    let resource = {};
    if (typeof text === 'object') {
      resource = text;
    } else {
      resource.comment = {text};
    }
    let attributes = options.attributes == undefined && !resource.requestedAttributes ? {TOXICITY: {}} : options.attributes;
    const doNotStore = options.doNotStore == undefined ? false : options.doNotStore;
    if (Array.isArray(options.attributes)) {
      attributes = {};
      options.attributes.forEach(each => {
        attributes[each.toUpperCase()] = {};
      });
    }
    merge(resource, {
      requestedAttributes: attributes,
      doNotStore
    });
    return new Promise((resolve, reject) => {
      this._getClient().then(client => {
        client.comments.analyze({key: this.options.apiKey, resource}, (err, response) => {
          if (err) {
            reject(err);
          }
          resolve(response);
        });
      }, reject);
    });
  }
  _getClient() {
    return new Promise((resolve, reject) => {
      if (this._client) {
        resolve(this._client);
      } else {
        this._createGoogleClient().then(client => {
          this._client = client;
          resolve(client);
        }, reject);
      }
    });
  }
  _createGoogleClient() {
    return new Promise((resolve, reject) => {
      googleapis.discoverAPI(COMMENT_ANALYZER_DISCOVERY_URL, (err, client) => {
        if (err) {
          reject(err);
        }
        resolve(client);
      });
    });
  }

}

module.exports = Perspective;
