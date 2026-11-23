import { expect } from 'chai'
import request from 'supertest'
import app from '../src/app.js'
import { resetStore, store } from '../src/data/store.js'

const credentials = {
  email: 'alpartun-auth@example.test',
  password: 'Strong123!',
}
const registration = { name: 'Jamie Test', ...credentials }
const nameError = 'Please enter your full name.'
const emailError = 'Please enter a valid email address.'
const passwordError =
  'Password must have at least 8 characters, one uppercase letter, one number, and one special character.'
const loginError = 'Email or password is incorrect.'
const identityError = 'A valid Mock-User-Id header is required.'

function register(fields = registration) {
  return request(app).post('/api/auth/register').send(fields)
}

function logIn(fields) {
  return request(app).post('/api/auth/login').send(fields)
}

function expectError(response, status, code, message) {
  expect(response.status).to.equal(status)
  expect(response.type).to.equal('application/json')
  expect(response.body).to.deep.equal({ error: { code, message } })
}

describe('[Alpartun] Authentication API', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('POST /api/auth/register', () => {
    it('registers one user with normalized details and only returns the public fields', async () => {
      const initialCount = store.users.length
      const response = await register({
        ...registration,
        name: '  Jamie Test  ',
        email: '  ALPARTUN-AUTH@EXAMPLE.TEST  ',
      }).expect(201).expect('Content-Type', /json/)

      expect(response.body.id).to.be.a('string').and.not.empty
      expect(response.body).to.deep.equal({
        id: response.body.id,
        name: 'Jamie Test',
        username: null,
        bio: '',
        location: '',
        imageUrl: '',
        interests: [],
        profileComplete: false,
      })
      expect(store.users).to.have.lengthOf(initialCount + 1)
      expect(store.users.find(({ id }) => id === response.body.id))
        .to.have.property('email', credentials.email)
    })

    const invalidFields = [
      ['a missing name', { name: undefined }, nameError],
      ['a name shorter than two characters after trimming', { name: ' A ' }, nameError],
      ['a non-string name', { name: 123 }, nameError],
      ['a missing email', { email: undefined }, emailError],
      ['a malformed email address', { email: 'jamie@invalid' }, emailError],
      ['a non-string email address', { email: 123 }, emailError],
      ['a missing password', { password: undefined }, passwordError],
      ['a non-string password', { password: 12345678 }, passwordError],
      ['a password shorter than eight characters', { password: 'Aa1!567' }, passwordError],
      ['a password without an uppercase letter', { password: 'lowercase123!' }, passwordError],
      ['a password without a number', { password: 'NoDigits!' }, passwordError],
      ['a password without a special character', { password: 'NoSpecial123' }, passwordError],
    ]

    for (const [label, fields, message] of invalidFields) {
      it(`rejects ${label} and leaves existing users intact`, async () => {
        const usersBefore = structuredClone(store.users)
        const response = await register({ ...registration, ...fields })

        expectError(response, 400, 'VALIDATION_ERROR', message)
        expect(store.users).to.deep.equal(usersBefore)
      })
    }

    it('rejects a missing request body', async () => {
      const usersBefore = structuredClone(store.users)
      const response = await request(app).post('/api/auth/register')

      expectError(response, 400, 'VALIDATION_ERROR', nameError)
      expect(store.users).to.deep.equal(usersBefore)
    })

    it('returns a structured error for malformed JSON', async () => {
      const usersBefore = structuredClone(store.users)
      const response = await request(app)
        .post('/api/auth/register')
        .type('json')
        .send('{"name":')

      expectError(response, 400, 'INVALID_JSON', 'The request body must contain valid JSON.')
      expect(store.users).to.deep.equal(usersBefore)
    })

    it('rejects a duplicate email across case and whitespace without replacing the account', async () => {
      const original = await register().expect(201)
      const usersBefore = structuredClone(store.users)
      const response = await register({
        name: 'Second Applicant',
        email: '  ALPARTUN-AUTH@EXAMPLE.TEST  ',
        password: 'Different123!',
      })

      expectError(response, 409, 'DUPLICATE_EMAIL', 'An account already uses this email address.')
      expect(store.users).to.deep.equal(usersBefore)

      const login = await logIn(credentials).expect(200)
      expect(login.body).to.deep.equal(original.body)
    })

    it('creates only one account when two registrations use the same email concurrently', async () => {
      const responses = await Promise.all([register(), register()])

      expect(responses.map(({ status }) => status)).to.have.members([201, 409])
      const conflict = responses.find(({ status }) => status === 409)
      expectError(conflict, 409, 'DUPLICATE_EMAIL', 'An account already uses this email address.')
      expect(store.users.filter(({ email }) => email === credentials.email)).to.have.lengthOf(1)
    })
  })

  describe('POST /api/auth/login', () => {
    let publicUser
    let usersBefore

    beforeEach(async () => {
      const response = await register().expect(201)
      publicUser = response.body
      usersBefore = structuredClone(store.users)
    })

    afterEach(() => {
      expect(store.users).to.deep.equal(usersBefore)
    })

    it('logs in with a normalized email and returns the registered public user', async () => {
      const response = await logIn({
        ...credentials,
        email: '  ALPARTUN-AUTH@EXAMPLE.TEST  ',
      }).expect(200).expect('Content-Type', /json/)

      expect(response.body).to.deep.equal(publicUser)
    })

    it('rejects an incorrect password for a registered email', async () => {
      const response = await logIn({ ...credentials, password: 'WrongPassword!' })

      expectError(response, 401, 'INVALID_CREDENTIALS', loginError)
    })

    it('gives the same credentials error for an unknown email', async () => {
      const response = await logIn({ ...credentials, email: 'unknown@example.test' })

      expectError(response, 401, 'INVALID_CREDENTIALS', loginError)
    })

    it('rejects login for a seeded profile without credentials', async () => {
      const seededUser = store.users.find((user) => user.email && !user.credentials)
      expect(seededUser).to.exist

      const response = await logIn({ ...credentials, email: seededUser.email })

      expectError(response, 401, 'INVALID_CREDENTIALS', loginError)
    })

    const invalidCredentials = [
      ['a missing email', { email: undefined }, emailError],
      ['a malformed email', { email: 'invalid' }, emailError],
      ['a missing password', { password: undefined }, 'Please enter your password.'],
      ['an empty password', { password: '' }, 'Please enter your password.'],
      ['a non-string password', { password: 12345678 }, 'Please enter your password.'],
    ]

    for (const [label, fields, message] of invalidCredentials) {
      it(`returns a validation error for ${label}`, async () => {
        const response = await logIn({ ...credentials, ...fields })

        expectError(response, 400, 'VALIDATION_ERROR', message)
      })
    }
  })

  describe('GET /api/users/me', () => {
    it('returns the public user from the mock identity header and disables caching', async () => {
      const { body: user } = await register().expect(201)
      const response = await request(app)
        .get('/api/users/me')
        .set('Mock-User-Id', user.id)
        .expect(200)
        .expect('Content-Type', /json/)
        .expect('Cache-Control', 'no-store')

      expect(response.body).to.deep.equal(user)
    })

    it('rejects a missing mock identity header even when the query specifies a real user', async () => {
      const { body: user } = await register().expect(201)
      const response = await request(app).get('/api/users/me').query({ userId: user.id })

      expectError(response, 401, 'INVALID_MOCK_IDENTITY', identityError)
    })

    it('rejects an unknown mock identity', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Mock-User-Id', 'unknown-auth-test-user')

      expectError(response, 401, 'INVALID_MOCK_IDENTITY', identityError)
    })

    it('rejects a registered user ID after the store is reset', async () => {
      const { body: user } = await register().expect(201)
      resetStore()
      const response = await request(app).get('/api/users/me').set('Mock-User-Id', user.id)

      expectError(response, 401, 'INVALID_MOCK_IDENTITY', identityError)
    })
  })
})
