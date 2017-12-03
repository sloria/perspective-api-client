import test from 'ava';
import moxios from 'moxios';
import repeat from 'lodash.repeat';
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

const createPerspective = () =>
  new Perspective({apiKey: process.env.PERSPECTIVE_API_KEY || 'mock-key'});

test('analyze (mocked)', async t => {
  moxios.install();
  const p = createPerspective();
  const promise = p.analyze('testing is for dummies');
  return new Promise(resolve => {
    moxios.wait(async () => {
      const request = moxios.requests.mostRecent();
      await request.respondWith({
        response: DEFAULT_RESPONSE,
        status: 200,
      });
      t.is(await promise, DEFAULT_RESPONSE);
      resolve();
    });
    moxios.uninstall();
  });
});

test('strips tags by default', t => {
  const p = createPerspective();
  const resource = p.makeResource('<p>good test</p>');
  t.is(resource.comment.text, 'good test');
});

test('stripHTML false', t => {
  const p = createPerspective();
  const resource = p.makeResource('<p>good test</p>', {stripHTML: false});
  t.is(resource.comment.text, '<p>good test</p>');
});

test('doNotStore is true by default', t => {
  const p = createPerspective();
  const resource = p.makeResource('good test');
  t.true(resource.doNotStore);
});

test('truncate', t => {
  const p = createPerspective();
  const text = repeat('x', 3001);
  // doesn't truncate by default
  const truncatedDefault = p.makeResource(text);
  t.is(truncatedDefault.comment.text, text);
  const truncated = p.makeResource(text, {truncate: true});
  t.is(truncated.comment.text, repeat('x', 3000));
  const notTruncated = p.makeResource(text, {truncate: false});
  t.is(notTruncated.comment.text, text);
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

  test('integration: text with > 3000 characters', async t => {
    const p = createPerspective();
    const text = repeat('x', 3001);
    await t.throws(p.analyze(text, {doNotStore: true}), Error);
  });
}
