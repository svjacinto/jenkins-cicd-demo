const request = require('supertest');
const app = require('../src/app');

describe('Demo app', () => {
  test('GET /health returns UP', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('UP');
  });

  test('GET / returns app message', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('Jenkins CI/CD demo app');
  });

  test('POST /echo returns submitted body', async () => {
    const response = await request(app)
      .post('/echo')
      .send({ hello: 'world' });

    expect(response.status).toBe(200);
    expect(response.body.received.hello).toBe('world');
  });
});
