import { expect } from 'chai'
import request from 'supertest'
import app from '../src/app.js'
import { resetStore } from '../src/data/store.js'

async function registerUser(email) {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Interests Test User', email, password: 'Strong123!' })
    .expect(201)

  return response.body
}

describe('[Alpartun] Interests API', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('GET /api/interests', () => {
    it('returns the ten canonical interests in order without requiring mock identity', async () => {
      const response = await request(app)
        .get('/api/interests')
        .expect(200)
        .expect('Content-Type', /json/)

      expect(response.body).to.deep.equal([
        'Coffee', 'Running', 'Art', 'Movies', 'Food',
        'Music', 'Study', 'Games', 'Sports', 'Hiking',
      ])
    })
  })

  describe('POST /api/users/:userId/interests', () => {
    let user

    beforeEach(async () => {
      user = await registerUser('alpartun-interests@example.test')
    })

    function updateInterests(body, actingUserId = user.id) {
      return request(app)
        .post(`/api/users/${user.id}/interests`)
        .set('Mock-User-Id', actingUserId)
        .send(body)
        .expect('Content-Type', /json/)
    }

    async function expectSavedInterests(interests) {
      const response = await request(app)
        .get('/api/users/me')
        .set('Mock-User-Id', user.id)
        .expect(200)

      expect(response.body).to.deep.equal({ ...user, interests })
    }

    it('saves multiple selections and returns the updated public user', async () => {
      const interests = ['Coffee', 'Hiking']
      const response = await updateInterests({ interests }).expect(200)

      expect(response.body).to.deep.equal({ ...user, interests })
      await expectSavedInterests(interests)
    })

    it('removes duplicate interests while preserving their first-seen order', async () => {
      const response = await updateInterests({
        interests: ['Hiking', 'Coffee', 'Hiking', 'Coffee'],
      }).expect(200)

      expect(response.body.interests).to.deep.equal(['Hiking', 'Coffee'])
      await expectSavedInterests(['Hiking', 'Coffee'])
    })

    it('normalizes Arts and Gaming to their canonical values before removing duplicates', async () => {
      const response = await updateInterests({
        interests: [' Arts ', 'Gaming', 'Sports', 'Art', 'Games'],
      }).expect(200)

      expect(response.body.interests).to.deep.equal(['Art', 'Games', 'Sports'])
      await expectSavedInterests(['Art', 'Games', 'Sports'])
    })

    it('accepts Skip before any selections have been made', async () => {
      const response = await updateInterests({ interests: [] }).expect(200)

      expect(response.body).to.deep.equal(user)
      await expectSavedInterests([])
    })

    describe('with an existing selection', () => {
      const previousInterests = ['Coffee', 'Hiking']

      beforeEach(async () => {
        await updateInterests({ interests: previousInterests }).expect(200)
      })

      it('replaces the existing selection', async () => {
        const interests = ['Study']
        const response = await updateInterests({ interests }).expect(200)

        expect(response.body.interests).to.deep.equal(interests)
        await expectSavedInterests(interests)
      })

      it('clears an existing selection when given an empty array', async () => {
        const response = await updateInterests({ interests: [] }).expect(200)

        expect(response.body.interests).to.deep.equal([])
        await expectSavedInterests([])
      })

      const invalidSelections = [
        ['a missing interests property', {}],
        ['a string instead of an array', { interests: 'Music' }],
        ['null instead of an array', { interests: null }],
        ['a non-string value in the array', { interests: ['Music', 42] }],
        ['an unknown interest mixed with a valid option', { interests: ['Music', 'Swimming'] }],
      ]

      for (const [label, body] of invalidSelections) {
        it(`rejects ${label} and preserves the previous selection`, async () => {
          const response = await updateInterests(body).expect(400)

          expect(response.body).to.deep.equal({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Interests must be an array of options from the interest catalog.',
            },
          })
          await expectSavedInterests(previousInterests)
        })
      }

      it('rejects a missing mock identity even when the body provides the owner ID', async () => {
        const response = await request(app)
          .post(`/api/users/${user.id}/interests`)
          .send({ interests: ['Music'], userId: user.id })
          .expect(401)
          .expect('Content-Type', /json/)

        expect(response.body).to.deep.equal({
          error: {
            code: 'INVALID_MOCK_IDENTITY',
            message: 'A valid Mock-User-Id header is required.',
          },
        })
        await expectSavedInterests(previousInterests)
      })

      it('rejects an unknown mock identity', async () => {
        const response = await updateInterests(
          { interests: ['Music'] },
          'unknown-interests-test-user',
        ).expect(401)

        expect(response.body).to.deep.equal({
          error: {
            code: 'INVALID_MOCK_IDENTITY',
            message: 'A valid Mock-User-Id header is required.',
          },
        })
        await expectSavedInterests(previousInterests)
      })

      it('forbids cross-user edits and preserves both registered users', async () => {
        const otherUser = await registerUser('alpartun-other-interests@example.test')
        const response = await updateInterests(
          { interests: ['Music'], userId: user.id },
          otherUser.id,
        ).expect(403)

        expect(response.body).to.deep.equal({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only update your own interests.',
          },
        })
        await expectSavedInterests(previousInterests)

        const other = await request(app)
          .get('/api/users/me')
          .set('Mock-User-Id', otherUser.id)
          .expect(200)

        expect(other.body).to.deep.equal(otherUser)
      })
    })
  })
})
