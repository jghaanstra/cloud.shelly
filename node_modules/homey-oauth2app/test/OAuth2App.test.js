/* eslint-disable max-classes-per-file */

'use strict';

jest.mock('node-fetch');
const fetch = require('node-fetch');
const homey = require('homey');
const OAuth2App = require('../lib/OAuth2App');
const OAuth2Client = require('../lib/OAuth2Client');

const { Response } = jest.requireActual('node-fetch');

class MyOAuth2Client extends OAuth2Client {

  async getLights({ selector = 'all' } = {}) {
    const lights = await this.get({
      path: `/lights/${selector}`,
    });

    if (!Array.isArray(lights)) {
      throw new Error('Invalid Response, Expected Array');
    }

    return lights;
  }

}

class MyApp extends OAuth2App {

  onOAuth2Init() {
    this.setOAuth2Config({
      client: MyOAuth2Client,
      apiUrl: 'https://api.athom-doesnt-exist.com/v1',
      tokenUrl: 'https://cloud.athom-doesnt-exist.com/oauth/token',
      authorizationUrl: 'https://cloud.athom-doesnt-exist.com/oauth/authorize',
      scopes: ['remote_control:all'],
    });
  }

}


test('test', async function() {
  const myApp = new MyApp(homey);
  const mySpy = jest.spyOn(myApp, 'onOAuth2Init');
  await myApp.onInit();
  expect(mySpy).toBeCalledTimes(1);
  const client = myApp.createOAuth2Client({ configId: 'default', sessionId: 'sessionId' });

  fetch.mockReturnValue(Promise.resolve(new Response('{"access_token": "access123", "refresh_token": "refresh123"}', {
    headers: {
      'content-type': 'application/json',
    },
  })));

  await client.getTokenByCredentials({ username: 'username', password: 'password' });
  fetch.mockReturnValue(Promise.resolve(new Response('[{"light": "wow"}]', {
    headers: {
      'content-type': 'application/json',
    },
  })));
  const lights = await client.getLights();
  expect(lights.length).toBe(1);
  expect(lights[0].light).toBe('wow');

  const order = [];
  // Now we're going to fake a token refresh
  fetch
    .mockReturnValueOnce(Promise.resolve(new Response('unauthorized', { status: 401 })))
    .mockReturnValueOnce(Promise.resolve(new Response('unauthorized', { status: 401 })))
    .mockReturnValueOnce(Promise.resolve(new Response('unauthorized', { status: 401 })))
    .mockReturnValueOnce(Promise.resolve(new Response('unauthorized', { status: 401 })))
    .mockReturnValueOnce(Promise.resolve(new Response('{"access_token": "access123", "refresh_token": "refresh123"}', {
      headers: {
        'content-type': 'application/json',
      },
    })))
    .mockImplementation(args => {
      const split = args.split('/');
      const id = parseInt(split[split.length - 1], 10);
      return new Promise(resolve => setTimeout(() => {
        order.push(id);
        resolve(new Response(`[{"light": "${id}"}]`, {
          headers: {
            'content-type': 'application/json',
          },
        }));
      }, id * 100)); // We simulate a slower call for higher ids
    });
  const promise1 = client.getLights({ selector: '4' });
  const promise2 = client.getLights({ selector: '3' });
  const promise3 = client.getLights({ selector: '2' });
  const promise4 = client.getLights({ selector: '1' });

  const [l1, l2, l3, l4] = await Promise.all([promise1, promise2, promise3, promise4]);

  expect(l1.length).toBe(1);
  expect(l1[0].light).toBe('4');
  expect(l2.length).toBe(1);
  expect(l2[0].light).toBe('3');
  expect(l3.length).toBe(1);
  expect(l3[0].light).toBe('2');
  expect(l4.length).toBe(1);
  expect(l4[0].light).toBe('1');
  // Because we no longer use a promise-queue the order in which these promises are resolved is
  // reversed because the first promise takes longer
  expect(order).toStrictEqual([1, 2, 3, 4]);
});
