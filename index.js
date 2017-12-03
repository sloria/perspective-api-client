'use strict';
const axios = require('axios');
const striptags = require('striptags');
const merge = require('lodash.merge');

const COMMENT_ANALYZER_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';
const MAX_LENGTH = 3000;

class Perspective {
  constructor(options) {
    this.options = options || {};
    if (!this.options.apiKey) {
      throw new Error('Must provide options.apiKey');
    }
  }
  analyze(text, options) {
    const resource = this.makeResource(text, options);
    return new Promise((resolve, reject) => {
      axios.post(COMMENT_ANALYZER_URL, resource, {
        params: {key: this.options.apiKey},
      }).then(response => {
        resolve(response.data);
      }, reject);
    });
  }
  makeResource(text, options) {
    const opts = options || {};
    const stripHTML = opts.stripHTML == undefined ? true : opts.stripHTML;
    const truncate = opts.truncate == undefined ? false : opts.truncate;
    const doNotStore = opts.doNotStore == undefined ? true : opts.doNotStore;
    const processText = str => {
      const ret = stripHTML ? striptags(str) : str;
      return truncate ? ret.substr(0, MAX_LENGTH) : ret;
    };
    let resource = {};
    if (typeof text === 'object') {
      resource = text;
      if (stripHTML && resource.comment.text) {
        resource.comment.text = processText(resource.comment.text);
      }
    } else {
      resource.comment = {text: processText(text)};
    }
    let attributes =
      opts.attributes == undefined && !resource.requestedAttributes
        ? {TOXICITY: {}}
        : opts.attributes;
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
}

module.exports = Perspective;
