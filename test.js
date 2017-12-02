import test from 'ava';
import sinon from 'sinon';
import Perspective from '.';

test('requires apiKey', t => {
  t.throws(() => new Perspective(), Error);
});

const DEFAULT_RESPONSE = {
  attributeScores: {
    TOXICITY: {
      spanScores: [
        {
          begin: 0,
          end: 56,
          score: {
            value: 0.8728314,
            type: 'PROBABILITY',
          },
        },
      ],
      summaryScore: {
        value: 0.8728314,
        type: 'PROBABILITY',
      },
    },
  },
  languages: ['en'],
};

const createMockedPerspective = (response = DEFAULT_RESPONSE) => {
  const p = new Perspective({apiKey: '123abc'});
  sinon.stub(p, '_createGoogleClient').callsFake(() => {
    return Promise.resolve({
      comments: {
        analyze(options, callback) {
          callback(null, response);
        },
      },
    });
  });
  return p;
};

const createPerspective = () =>
  new Perspective({apiKey: process.env.PERSPECTIVE_API_KEY});

test('analyze', async t => {
  const p = createMockedPerspective();
  const result = await p.analyze('testing is for dummies');
  t.is(result, DEFAULT_RESPONSE);
});

if (process.env.PERSPECTIVE_API_KEY && process.env.TEST_INTEGRATION) {
  test('integration:analyze', async t => {
    const p = createPerspective();
    const result = await p.analyze('testing is for dummies', {
      doNotStore: true,
    });
    t.log(JSON.stringify(result, null, 2));
    t.truthy(result);
    t.truthy(result.attributeScores.TOXICITY);
  });

  test('integration:analyze with attributes passed as array', async t => {
    const p = createPerspective();
    const result = await p.analyze('jolly good tests', {
      attributes: ['unsubstantial', 'spam'],
      doNotStore: true,
    });
    t.log(JSON.stringify(result, null, 2));
    t.truthy(result);
    t.falsy(result.attributeScores.TOXICITY);
    t.truthy(result.attributeScores.UNSUBSTANTIAL);
    t.truthy(result.attributeScores.SPAM);
  });

  test('integration:analyze with AnalyzeComment object passed', async t => {
    const p = createPerspective();
    const result = await p.analyze({
      comment: {text: 'hooray for tests'},
      requestedAttributes: {
        UNSUBSTANTIAL: {},
        SPAM: {},
      },
      clientToken: 'test',
      doNotStore: true,
    });
    t.log(JSON.stringify(result, null, 2));
    t.truthy(result);
    t.falsy(result.attributeScores.TOXICITY);
    t.truthy(result.attributeScores.UNSUBSTANTIAL);
    t.truthy(result.attributeScores.SPAM);
    t.is(result.clientToken, 'test');
  });
}
