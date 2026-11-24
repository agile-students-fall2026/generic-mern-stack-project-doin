import { expect } from 'chai'
import request from 'supertest'
import app from '../src/app.js'
import { resetStore } from '../src/data/store.js'

describe('[Maurice] Connections API', () => {
  const alex = 'user-alex'
  const jordan = 'user-jordan'
  const sam = 'user-sam'

  beforeEach(() => {
    resetStore()
  })

  // Send a connection request
  function sendRequest(senderId, recipientId) {
    return request(app)
      .post('/api/connections/requests')
      .set('Mock-User-Id', senderId)
      .send({ recipientId })
  }

  // Retrieve pending requests
  function getRequests(userId) {
    return request(app)
      .get(`/api/users/${userId}/connection-requests`)
      .set('Mock-User-Id', userId)
  }

  // Update a connection request
  function updateRequest(userId, requestId, status) {
    return request(app)
      .patch(`/api/connections/requests/${requestId}`)
      .set('Mock-User-Id', userId)
      .send({ status })
  }

  // Retrieve accepted connections
  function getConnections(userId) {
    return request(app)
      .get(`/api/users/${userId}/connections`)
      .set('Mock-User-Id', userId)
  }

  describe('POST /api/connections/requests', () => {
    it('sends a valid connection request', async () => {
      const response = await sendRequest(alex, jordan)

      expect(response.status).to.equal(201)
      expect(response.body.id).to.be.a('string')
      expect(response.body.senderId).to.equal(alex)
      expect(response.body.recipientId).to.equal(jordan)
      expect(response.body.status).to.equal('pending')
    })

    it('rejects duplicate pending requests', async () => {
      await sendRequest(alex, jordan)

      const response = await sendRequest(alex, jordan)

      expect(response.status).to.equal(409)
      expect(response.body.error.code)
        .to.equal('REQUEST_ALREADY_PENDING')
    })

    it('rejects reverse duplicate requests', async () => {
      await sendRequest(alex, jordan)

      const response = await sendRequest(jordan, alex)

      expect(response.status).to.equal(409)
      expect(response.body.error.code)
        .to.equal('REQUEST_ALREADY_PENDING')
    })

    it('rejects requests between accepted connections', async () => {
      const created = await sendRequest(alex, jordan)

      await updateRequest(jordan, created.body.id, 'accepted')

      const response = await sendRequest(alex, jordan)

      expect(response.status).to.equal(409)
      expect(response.body.error.code)
        .to.equal('ALREADY_CONNECTED')
    })

    it('rejects self-connection requests', async () => {
      const response = await sendRequest(alex, alex)

      expect(response.status).to.equal(400)
      expect(response.body.error.code)
        .to.equal('VALIDATION_ERROR')
    })

    it('rejects nonexistent recipients', async () => {
      const response = await sendRequest(alex, 'invalid-user')

      expect(response.status).to.equal(404)
      expect(response.body.error.code).to.equal('NOT_FOUND')
    })

    it('rejects missing recipient IDs', async () => {
      const response = await request(app)
        .post('/api/connections/requests')
        .set('Mock-User-Id', alex)
        .send({})

      expect(response.status).to.equal(400)
      expect(response.body.error.code)
        .to.equal('VALIDATION_ERROR')
    })

    it('rejects empty recipient IDs', async () => {
      const response = await sendRequest(alex, '')

      expect(response.status).to.equal(400)
      expect(response.body.error.code)
        .to.equal('VALIDATION_ERROR')
    })

    it('rejects non-string recipient IDs', async () => {
      const response = await sendRequest(alex, 123)

      expect(response.status).to.equal(400)
      expect(response.body.error.code)
        .to.equal('VALIDATION_ERROR')
    })

    it('rejects invalid mock users', async () => {
      const response = await sendRequest('invalid-user', jordan)

      expect(response.status).to.equal(401)
      expect(response.body.error.code)
        .to.equal('INVALID_MOCK_IDENTITY')
    })

    it('rejects missing mock user headers', async () => {
      const response = await request(app)
        .post('/api/connections/requests')
        .send({ recipientId: jordan })

      expect(response.status).to.equal(401)
      expect(response.body.error.code)
        .to.equal('INVALID_MOCK_IDENTITY')
    })
  })

  describe('GET /api/users/:userId/connection-requests', () => {
    it('returns an empty list when no requests exist', async () => {
      const response = await getRequests(alex)

      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal([])
    })

    it('returns outgoing pending requests', async () => {
      const created = await sendRequest(alex, jordan)
      const response = await getRequests(alex)

      expect(response.status).to.equal(200)
      expect(response.body).to.deep.include(created.body)
    })

    it('returns incoming pending requests', async () => {
      const created = await sendRequest(alex, jordan)
      const response = await getRequests(jordan)

      expect(response.status).to.equal(200)
      expect(response.body).to.deep.include(created.body)
    })

    it('returns consistent pending requests for both users', async () => {
      const created = await sendRequest(alex, jordan)

      const outgoing = await getRequests(alex)
      const incoming = await getRequests(jordan)

      expect(outgoing.status).to.equal(200)
      expect(incoming.status).to.equal(200)
      expect(outgoing.body).to.deep.equal(incoming.body)
      expect(outgoing.body).to.deep.equal([created.body])
      expect(outgoing.body[0].status).to.equal('pending')
    })

    it('does not return unrelated requests', async () => {
      await sendRequest(alex, jordan)

      const response = await getRequests(sam)

      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal([])
    })

    it('rejects access to another user’s requests', async () => {
      const response = await request(app)
        .get(`/api/users/${jordan}/connection-requests`)
        .set('Mock-User-Id', alex)

      expect(response.status).to.equal(403)
      expect(response.body.error.code).to.equal('FORBIDDEN')
    })

    it('rejects nonexistent users', async () => {
      const response = await request(app)
        .get('/api/users/invalid-user/connection-requests')
        .set('Mock-User-Id', alex)

      expect(response.status).to.equal(404)
      expect(response.body.error.code).to.equal('NOT_FOUND')
    })
  })

  describe('PATCH /api/connections/requests/:requestId', () => {
    it('allows the recipient to accept a request', async () => {
      const created = await sendRequest(alex, jordan)

      const response = await updateRequest(
        jordan,
        created.body.id,
        'accepted'
      )

      expect(response.status).to.equal(200)
      expect(response.body.id).to.equal(created.body.id)
      expect(response.body.senderId).to.equal(alex)
      expect(response.body.recipientId).to.equal(jordan)
      expect(response.body.status).to.equal('accepted')
    })

    it('allows the recipient to decline a request', async () => {
      const created = await sendRequest(alex, jordan)

      const response = await updateRequest(
        jordan,
        created.body.id,
        'declined'
      )

      expect(response.status).to.equal(200)
      expect(response.body.status).to.equal('declined')
    })

    it('allows the sender to cancel a request', async () => {
      const created = await sendRequest(alex, jordan)

      const response = await updateRequest(
        alex,
        created.body.id,
        'cancelled'
      )

      expect(response.status).to.equal(200)
      expect(response.body.status).to.equal('cancelled')
    })

    it('removes accepted requests from both pending lists', async () => {
      const created = await sendRequest(alex, jordan)

      const updated = await updateRequest(
        jordan,
        created.body.id,
        'accepted'
      )

      expect(updated.status).to.equal(200)

      const senderRequests = await getRequests(alex)
      const recipientRequests = await getRequests(jordan)

      expect(senderRequests.status).to.equal(200)
      expect(recipientRequests.status).to.equal(200)
      expect(senderRequests.body).to.deep.equal([])
      expect(recipientRequests.body).to.deep.equal([])
    })

    it('removes declined requests without creating connections', async () => {
      const created = await sendRequest(alex, jordan)

      const updated = await updateRequest(
        jordan,
        created.body.id,
        'declined'
      )

      expect(updated.status).to.equal(200)
      expect(updated.body.status).to.equal('declined')

      const senderRequests = await getRequests(alex)
      const recipientRequests = await getRequests(jordan)
      const senderConnections = await getConnections(alex)
      const recipientConnections = await getConnections(jordan)

      expect(senderRequests.status).to.equal(200)
      expect(recipientRequests.status).to.equal(200)
      expect(senderConnections.status).to.equal(200)
      expect(recipientConnections.status).to.equal(200)

      expect(senderRequests.body).to.deep.equal([])
      expect(recipientRequests.body).to.deep.equal([])
      expect(senderConnections.body).to.deep.equal([])
      expect(recipientConnections.body).to.deep.equal([])
    })

    it('removes cancelled requests without creating connections', async () => {
      const created = await sendRequest(alex, jordan)

      const updated = await updateRequest(
        alex,
        created.body.id,
        'cancelled'
      )

      expect(updated.status).to.equal(200)
      expect(updated.body.status).to.equal('cancelled')

      const senderRequests = await getRequests(alex)
      const recipientRequests = await getRequests(jordan)
      const senderConnections = await getConnections(alex)
      const recipientConnections = await getConnections(jordan)

      expect(senderRequests.status).to.equal(200)
      expect(recipientRequests.status).to.equal(200)
      expect(senderConnections.status).to.equal(200)
      expect(recipientConnections.status).to.equal(200)

      expect(senderRequests.body).to.deep.equal([])
      expect(recipientRequests.body).to.deep.equal([])
      expect(senderConnections.body).to.deep.equal([])
      expect(recipientConnections.body).to.deep.equal([])
    })

    it('prevents senders from accepting their own requests', async () => {
      const created = await sendRequest(alex, jordan)

      const response = await updateRequest(
        alex,
        created.body.id,
        'accepted'
      )

      expect(response.status).to.equal(403)
      expect(response.body.error.code).to.equal('FORBIDDEN')
    })

    it('prevents senders from declining their own requests', async () => {
      const created = await sendRequest(alex, jordan)

      const response = await updateRequest(
        alex,
        created.body.id,
        'declined'
      )

      expect(response.status).to.equal(403)
      expect(response.body.error.code).to.equal('FORBIDDEN')
    })

    it('prevents recipients from cancelling requests', async () => {
      const created = await sendRequest(alex, jordan)

      const response = await updateRequest(
        jordan,
        created.body.id,
        'cancelled'
      )

      expect(response.status).to.equal(403)
      expect(response.body.error.code).to.equal('FORBIDDEN')
    })

    it('prevents unrelated users from updating requests', async () => {
      const created = await sendRequest(alex, jordan)

      const response = await updateRequest(
        sam,
        created.body.id,
        'accepted'
      )

      expect(response.status).to.equal(403)
      expect(response.body.error.code).to.equal('FORBIDDEN')
    })

    it('rejects invalid request statuses', async () => {
      const created = await sendRequest(alex, jordan)

      const response = await updateRequest(
        jordan,
        created.body.id,
        'invalid-status'
      )

      expect(response.status).to.equal(400)
      expect(response.body.error.code)
        .to.equal('VALIDATION_ERROR')
    })

    it('rejects nonexistent connection requests', async () => {
      const response = await updateRequest(
        jordan,
        'invalid-request',
        'accepted'
      )

      expect(response.status).to.equal(404)
      expect(response.body.error.code).to.equal('NOT_FOUND')
    })

    it('rejects updates to accepted requests', async () => {
      const created = await sendRequest(alex, jordan)

      await updateRequest(jordan, created.body.id, 'accepted')

      const response = await updateRequest(
        jordan,
        created.body.id,
        'declined'
      )

      expect(response.status).to.equal(409)
      expect(response.body.error.code)
        .to.equal('INVALID_TRANSITION')
    })

    it('rejects updates to declined requests', async () => {
      const created = await sendRequest(alex, jordan)

      await updateRequest(jordan, created.body.id, 'declined')

      const response = await updateRequest(
        jordan,
        created.body.id,
        'accepted'
      )

      expect(response.status).to.equal(409)
      expect(response.body.error.code)
        .to.equal('INVALID_TRANSITION')
    })

    it('rejects updates to cancelled requests', async () => {
      const created = await sendRequest(alex, jordan)

      await updateRequest(alex, created.body.id, 'cancelled')

      const response = await updateRequest(
        jordan,
        created.body.id,
        'accepted'
      )

      expect(response.status).to.equal(409)
      expect(response.body.error.code)
        .to.equal('INVALID_TRANSITION')
    })

    it('allows a new request after cancellation', async () => {
      const created = await sendRequest(alex, jordan)

      await updateRequest(alex, created.body.id, 'cancelled')

      const response = await sendRequest(alex, jordan)

      expect(response.status).to.equal(201)
      expect(response.body.status).to.equal('pending')
      expect(response.body.id).to.not.equal(created.body.id)
    })
  })

  describe('GET /api/users/:userId/connections', () => {
    it('returns an empty list when no connections exist', async () => {
      const response = await getConnections(alex)

      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal([])
    })

    it('does not include pending requests as connections', async () => {
      await sendRequest(alex, jordan)

      const response = await getConnections(alex)

      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal([])
    })

    it('returns accepted connections for both users', async () => {
      const created = await sendRequest(alex, jordan)

      const updated = await updateRequest(
        jordan,
        created.body.id,
        'accepted'
      )

      expect(updated.status).to.equal(200)

      const senderConnections = await getConnections(alex)
      const recipientConnections = await getConnections(jordan)

      expect(senderConnections.status).to.equal(200)
      expect(recipientConnections.status).to.equal(200)

      expect(senderConnections.body).to.have.lengthOf(1)
      expect(recipientConnections.body).to.have.lengthOf(1)

      expect(senderConnections.body[0].id).to.equal(jordan)
      expect(recipientConnections.body[0].id).to.equal(alex)
    })

    it('does not return unrelated accepted connections', async () => {
      const created = await sendRequest(alex, jordan)

      await updateRequest(jordan, created.body.id, 'accepted')

      const response = await getConnections(sam)

      expect(response.status).to.equal(200)
      expect(response.body).to.deep.equal([])
    })

    it('does not expose private user information', async () => {
      const created = await sendRequest(alex, jordan)

      await updateRequest(jordan, created.body.id, 'accepted')

      const response = await getConnections(alex)

      expect(response.status).to.equal(200)
      expect(response.body).to.have.lengthOf(1)
      expect(response.body[0]).to.not.have.property('email')
      expect(response.body[0]).to.not.have.property('password')
      expect(response.body[0]).to.not.have.property('passwordHash')
    })

    it('rejects access to another user’s connections', async () => {
      const response = await request(app)
        .get(`/api/users/${jordan}/connections`)
        .set('Mock-User-Id', alex)

      expect(response.status).to.equal(403)
      expect(response.body.error.code).to.equal('FORBIDDEN')
    })

    it('rejects nonexistent users', async () => {
      const response = await request(app)
        .get('/api/users/invalid-user/connections')
        .set('Mock-User-Id', alex)

      expect(response.status).to.equal(404)
      expect(response.body.error.code).to.equal('NOT_FOUND')
    })
  })
})