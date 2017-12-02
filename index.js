'use strict';
const googleapis = require('googleapis');
const striptags = require('striptags');
const merge = require('lodash.merge');

const COMMENT_ANALYZER_DISCOVERY_URL =
  'https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1';

class Perspective {
  constructor(options) {
    this.options = options || {};
    if (!this.options.apiKey) {
      throw new Error('Must provide options.apiKey');
    }
    this._client = null;
  }
  analyze(text, options) {
    const resource = this._makeResource(text, options);
    return new Promise((resolve, reject) => {
      this._getClient().then(client => {
        // prettier-ignore
        client.comments.analyze(
          {key: this.options.apiKey, resource},
          (err, response) => {
            if (err) {
              reject(err);
            }
            resolve(response);
          }  // eslint-disable-line comma-dangle
        );
      }, reject);
    });
  }
  _makeResource(text, options) {
    const opts = options || {};
    const stripHTML = opts.stripHTML == undefined ? true : opts.stripHTML;
    let resource = {};
    if (typeof text === 'object') {
      resource = text;
      if (stripHTML && resource.comment.text) {
        resource.comment.text = striptags(resource.comment.text);
      }
    } else {
      resource.comment = {text: stripHTML ? striptags(text) : text};
    }
    let attributes =
      opts.attributes == undefined && !resource.requestedAttributes
        ? {TOXICITY: {}}
        : opts.attributes;
    const doNotStore = opts.doNotStore == undefined ? true : opts.doNotStore;
    if (Array.isArray(opts.attributes)) {
      attributes = {};
      opts.attributes.forEach(each => {
        attributes[each.toUpperCase()] = {};
      });
    }
    return merge({}, resource, {
      requestedAttributes: attributes,
      doNotStore,
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
