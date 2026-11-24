import { expect } from 'chai'
import request from 'supertest'
import app from '../src/app.js'
import { resetStore } from '../src/data/store.js'

// Tests for the profile and people discovery endpoints from #98, #99,
// and #100. They run on the shared test setup from #109 and follow the
// pattern in back-end/TESTING.md. Run only these tests with
// npm test -- --grep '\[Alp\]'
describe('[Alp] Profile and People Discovery API', () => {
  beforeEach(() => {
    resetStore()
  })

  // Registers a new user through the auth endpoint from #93 and returns
  // the public record. New users start with no profile set up.
  async function registerUser() {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New Person', email: 'new@example.com', password: 'Passw0rd!' })
    return response.body
  }

  describe('GET /api/users/:userId', () => {
    it('returns an existing profile', async () => {
      const response = await request(app).get('/api/users/user-alex')

      expect(response.status).to.equal(200)
      expect(response.body.id).to.equal('user-alex')
      expect(response.body.name).to.equal('Alex Morgan')
      expect(response.body.username).to.equal('alexmorgan')
      expect(response.body.interests).to.deep.equal(['Coffee', 'Hiking'])
    })

    it('returns 404 for a user that does not exist', async () => {
      const response = await request(app).get('/api/users/user-nobody')

      expect(response.status).to.equal(404)
      expect(response.body.error.code).to.equal('NOT_FOUND')
    })

    it('does not send private information', async () => {
      const response = await request(app).get('/api/users/user-alex')

      expect(response.body).to.not.have.property('email')
      expect(response.body).to.not.have.property('credentials')
      expect(response.body).to.not.have.property('password')
    })
  })

  describe('POST /api/profiles', () => {
    it('sets up the profile of the signed in user', async () => {
      const user = await registerUser()

      const response = await request(app)
        .post('/api/profiles')
        .set('Mock-User-Id', user.id)
        .send({ username: 'newperson', bio: 'Hello there', location: 'New York, NY', interests: ['Coffee', 'Study'] })

      expect(response.status).to.equal(200)
      expect(response.body.username).to.equal('newperson')
      expect(response.body.bio).to.equal('Hello there')
      expect(response.body.interests).to.deep.equal(['Coffee', 'Study'])
      expect(response.body.profileComplete).to.equal(true)
    })

    it('returns 401 when no user is signed in', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .send({ username: 'newperson' })

      expect(response.status).to.equal(401)
      expect(response.body.error.code).to.equal('INVALID_MOCK_IDENTITY')
    })

    it('returns 400 when the username is missing', async () => {
      const user = await registerUser()

      const response = await request(app)
        .post('/api/profiles')
        .set('Mock-User-Id', user.id)
        .send({ bio: 'Hello there' })

      expect(response.status).to.equal(400)
      expect(response.body.error.code).to.equal('VALIDATION_ERROR')
    })

    it('returns 400 for an interest that is not on the shared list', async () => {
      const user = await registerUser()

      const response = await request(app)
        .post('/api/profiles')
        .set('Mock-User-Id', user.id)
        .send({ username: 'newperson', interests: ['Skydiving'] })

      expect(response.status).to.equal(400)
      expect(response.body.error.code).to.equal('VALIDATION_ERROR')
    })

    it('returns 409 when the username is already taken', async () => {
      const user = await registerUser()

      const response = await request(app)
        .post('/api/profiles')
        .set('Mock-User-Id', user.id)
        .send({ username: 'alexmorgan' })

      expect(response.status).to.equal(409)
      expect(response.body.error.code).to.equal('DUPLICATE_USERNAME')
    })
  })

  describe('PATCH /api/users/:userId', () => {
    it('updates the profile of the signed in user', async () => {
      const response = await request(app)
        .patch('/api/users/user-alex')
        .set('Mock-User-Id', 'user-alex')
        .send({ bio: 'Updated bio', interests: ['Coffee', 'Running'] })

      expect(response.status).to.equal(200)
      expect(response.body.bio).to.equal('Updated bio')
      expect(response.body.interests).to.deep.equal(['Coffee', 'Running'])
    })

    it('returns 403 when updating another user', async () => {
      const response = await request(app)
        .patch('/api/users/user-jordan')
        .set('Mock-User-Id', 'user-alex')
        .send({ bio: 'Updated bio' })

      expect(response.status).to.equal(403)
      expect(response.body.error.code).to.equal('FORBIDDEN')
    })

    it('returns 404 for a user that does not exist', async () => {
      const response = await request(app)
        .patch('/api/users/user-nobody')
        .set('Mock-User-Id', 'user-alex')
        .send({ bio: 'Updated bio' })

      expect(response.status).to.equal(404)
      expect(response.body.error.code).to.equal('NOT_FOUND')
    })

    it('returns 400 for an interest that is not on the shared list', async () => {
      const response = await request(app)
        .patch('/api/users/user-alex')
        .set('Mock-User-Id', 'user-alex')
        .send({ interests: ['Skydiving'] })

      expect(response.status).to.equal(400)
      expect(response.body.error.code).to.equal('VALIDATION_ERROR')
    })

    it('returns 409 when the username is already taken', async () => {
      const response = await request(app)
        .patch('/api/users/user-alex')
        .set('Mock-User-Id', 'user-alex')
        .send({ username: 'jordanlee' })

      expect(response.status).to.equal(409)
      expect(response.body.error.code).to.equal('DUPLICATE_USERNAME')
    })
  })

  describe('GET /api/users', () => {
    it('returns the discoverable users', async () => {
      const response = await request(app).get('/api/users')

      expect(response.status).to.equal(200)
      expect(response.body).to.have.lengthOf(6)
    })

    it('leaves out the signed in user', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Mock-User-Id', 'user-alex')

      expect(response.status).to.equal(200)
      expect(response.body).to.have.lengthOf(5)
      const ids = response.body.map((person) => person.id)
      expect(ids).to.not.include('user-alex')
    })

    it('does not send private information', async () => {
      const response = await request(app).get('/api/users')

      for (const person of response.body) {
        expect(person).to.not.have.property('email')
        expect(person).to.not.have.property('credentials')
        expect(person).to.not.have.property('password')
      }
    })

    it('finds users by part of their name', async () => {
      const response = await request(app).get('/api/users').query({ search: 'alex' })

      expect(response.status).to.equal(200)
      expect(response.body).to.have.lengthOf(1)
      expect(response.body[0].id).to.equal('user-alex')
    })

    it('finds users by username in any capital letters', async () => {
      const response = await request(app).get('/api/users').query({ search: 'PriyaPatel' })

      expect(response.status).to.equal(200)
      expect(response.body).to.have.lengthOf(1)
      expect(response.body[0].id).to.equal('user-priya')
    })

    it('filters users by one interest', async () => {
      const response = await request(app).get('/api/users').query({ interest: 'Coffee' })

      expect(response.status).to.equal(200)
      expect(response.body).to.have.lengthOf(1)
      expect(response.body[0].id).to.equal('user-alex')
    })

    it('filters users by interest in any capital letters', async () => {
      const response = await request(app).get('/api/users').query({ interest: 'hiking' })

      expect(response.status).to.equal(200)
      expect(response.body).to.have.lengthOf(2)
    })

    it('needs every selected interest to match', async () => {
      const response = await request(app)
        .get('/api/users')
        .query({ interest: ['Hiking', 'Music'] })

      expect(response.status).to.equal(200)
      expect(response.body).to.have.lengthOf(1)
      expect(response.body[0].id).to.equal('user-taylor')
    })

    it('combines search and interest filtering', async () => {
      const response = await request(app)
        .get('/api/users')
        .query({ search: 'taylor', interest: 'Games' })

      expect(response.status).to.equal(200)
      expect(response.body).to.have.lengthOf(1)
      expect(response.body[0].id).to.equal('user-taylor')
    })

    it('returns an empty list when search and interest do not match together', async () => {
      const response = await request(app)
        .get('/api/users')
        .query({ search: 'alex', interest: 'Games' })

      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal([])
    })

    it('returns an empty list when nothing matches', async () => {
      const response = await request(app).get('/api/users').query({ search: 'zzzzz' })

      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal([])
    })

    it('returns 400 for an interest that is not on the shared list', async () => {
      const response = await request(app).get('/api/users').query({ interest: 'Skydiving' })

      expect(response.status).to.equal(400)
      expect(response.body.error.code).to.equal('VALIDATION_ERROR')
    })
  })
})
