const Perspective = require('.');

const perspective = new Perspective({apiKey: process.env.PERSPECTIVE_API_KEY});

module.exports = {
  context: {
    perspective,
  },
  enableAwait: true,
};
