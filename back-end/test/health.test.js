
import { expect } from 'chai'
import request from 'supertest'
import app from '../src/app.js'
import { resetStore } from '../src/data/store.js'

describe('[Maurice] GET /api/health', () => {
  beforeEach(() => {
    resetStore()
  })

  it('returns status ok', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).to.equal(200)
    expect(response.body).to.deep.equal({ status: 'ok' })
  })
})
