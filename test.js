import test from 'ava';
import moxios from 'moxios';
import repeat from 'lodash.repeat';
import Perspective, {TextEmptyError, TextTooLongError} from '.';

test('requires apiKey', t => {
  t.throws(() => new Perspective(), Error);
});

const MOCK_RESPONSE = {
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
        response: MOCK_RESPONSE,
        status: 200,
      });
      t.is(await promise, MOCK_RESPONSE);
      resolve();
    });
    moxios.uninstall();
  });
});

test('strips tags by default', t => {
  const p = createPerspective();
  const payload = p.getAnalyzeCommentPayload('<p>good test</p>');
  t.is(payload.comment.text, 'good test');
});

test('stripHTML false', t => {
  const p = createPerspective();
  const payload = p.getAnalyzeCommentPayload('<p>good test</p>', {
    stripHTML: false,
  });
  t.is(payload.comment.text, '<p>good test</p>');
});

test('doNotStore is true by default', t => {
  const p = createPerspective();
  const payload = p.getAnalyzeCommentPayload('good test');
  t.true(payload.doNotStore);
});

test('truncate', t => {
  const p = createPerspective();
  // doesn't truncate by default
  const text = repeat('x', 3001);
  t.throws(() => p.getAnalyzeCommentPayload(text), Error);
  const truncated = p.getAnalyzeCommentPayload(text, {truncate: true});
  t.is(truncated.comment.text, repeat('x', 3000));
  t.throws(() => p.getAnalyzeCommentPayload(text, {truncate: false}), Error);
});

test('analyze with attributes passed as an array', t => {
  const p = createPerspective();
  const payload = p.getAnalyzeCommentPayload('good test', {
    attributes: ['unsubstantial', 'spam'],
  });
  t.truthy(payload.requestedAttributes.UNSUBSTANTIAL);
  t.truthy(payload.requestedAttributes.SPAM);
});

test('analyze with AnalyzeComment object passed', t => {
  const p = createPerspective();
  const requestPayload = {
    comment: {text: 'hooray for tests'},
    requestedAttributes: {
      UNSUBSTANTIAL: {},
      SPAM: {},
    },
    clientToken: 'test',
    doNotStore: true,
  };
  const payload = p.getAnalyzeCommentPayload(requestPayload);
  t.deepEqual(payload, requestPayload);
});

test('text is required', t => {
  const p = createPerspective();
  const error = t.throws(
    () => p.getAnalyzeCommentPayload(),
    /text must not be empty/
  );
  t.true(error instanceof TextEmptyError);
  const error2 = t.throws(
    () => p.getAnalyzeCommentPayload(''),
    /text must not be empty/
  );
  t.true(error2 instanceof TextEmptyError);
});

test('> 3000 characters in text is invalid', t => {
  const p = createPerspective();
  const text = repeat('x', 3001);
  // prettier-ignore
  const error = t.throws(() => p.getAnalyzeCommentPayload(text), /text must not be greater than 3000 characters in length/);
  t.true(error instanceof TextTooLongError);
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
}
