
# Doin Back-End Testing Guide

## Overview

We use Mocha, Chai, Supertest, and c8 to test our Express.js back end.

- Mocha: Runs automated tests.
- Chai: Checks expected results.
- Supertest: Tests Express API endpoints.
- c8: Measures code coverage.

## Running Tests

Navigate to the back-end directory:

```bash
cd back-end
npm install
```

Run all tests:

```bash
npm test
```

Run tests with code coverage:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

## Test File Organization

All tests belong in the `test/` directory.

Name test files based on their features:

- health.test.js
- auth.test.js
- profiles.test.js
- events.test.js
- participation.test.js
- connections.test.js

## Writing Tests

Use ES module imports.

Example:

```javascript
import { expect } from 'chai'
import request from 'supertest'
import app from '../src/app.js'

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).to.equal(200)
    expect(response.body).to.deep.equal({ status: 'ok' })
  })
})
```

Use describe() to group tests and it() to define individual test cases.

Test both successful requests and error responses.

## Mock Data

Doin uses one shared in-memory data store.

Tests that modify or depend on store data should reset it before each test:

```javascript
import { resetStore } from '../src/data/store.js'

beforeEach(() => {
  resetStore()
})
```

This prevents tests from affecting one another.

Do not create separate shared stores for different features.

## API Testing

Use Supertest to make requests directly to Express.

For endpoints requiring a current user, include the Mock-User-Id header.

Check HTTP status codes and JSON responses.

## Code Coverage

We use c8 to measure back-end code coverage.

Run all tests with coverage:

```bash
npm run test:coverage
```
### Individual Developer Coverage

Each developer must write their own tests contributing at least 10% back-end code coverage.

To identify test ownership, include your name in the Mocha describe() block:

```javascript
describe('[Maurice] Connections API', () => {
  // Tests go here
})
```

To run only your own tests:

```bash
npm test -- --grep '\[Maurice\]'
```

To generate coverage using only your tests:

```bash
npm run test:coverage:individual -- --grep '\[Maurice\]'
```

Replace `Maurice` with your own name.

Individual coverage reports are saved in `coverage/individual/`.

The individual report measures code executed by the selected tests against the back-end source files. Coverage percentages may overlap between developers and do not automatically add up to 100%.

Each developer should commit their own tests so contributions are visible in Git history.
## Team Conventions

- Store test files in back-end/test/.
- Name files using the .test.js extension.
- Use Mocha and Chai for tests.
- Use Supertest for HTTP endpoint testing.
- Reset shared mock data between tests.
- Test successful requests and common error cases.
- Run all tests before submitting a pull request.
- Coordinate changes to shared testing configuration.
