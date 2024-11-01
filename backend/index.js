import Fastify from 'fastify'
import { Client } from '@vercel/postgres'

const API_URL = 'https://api.lemonsqueezy.com/v1'
const PORT = process.env.PORT || 3000
const host = 'RENDER' in process.env ? `0.0.0.0` : `localhost`

const fastify = Fastify({
  logger: true,
})

const client = new Client()

// Создание таблицы для хранения фидбэка, если её ещё нет
async function initializeDatabase() {
  await client.connect()
  await client.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
}

// TODO: add DB to checking account and API key match

fastify.addHook('preHandler', (req, reply, done) => {
  reply.header('Access-Control-Allow-Origin', '*')
  reply.header('Access-Control-Allow-Methods', 'POST, PUT')
  done()
})

async function sendRequest(url, method = 'GET', data = null) {
  const response = await fetch(`${API_URL}/${url}`, {
    method,
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${process.env.API_KEY}`,
    },
    body: data ? JSON.stringify(data) : null,
  })
  const json = await response.json()
  fastify.log.info(json)
  return json
}

fastify.get('/health', () => {
  return { status: 'ok' }
})

fastify.post('/license/validate', async (request) => {
  const body = JSON.parse(request.body)
  if (!body.licenseKey) {
    return { success: false, status: 'empty_license_key' }
  }
  if (!body.instanceId) {
    return { success: false, status: 'empty_instance_id' }
  }
  const response = await sendRequest('licenses/validate', 'POST', {
    license_key: body.licenseKey,
    instance_id: body.instanceId,
  })
  if (response.valid) {
    return { success: true, status: 'ok' }
  } else {
    return { success: false, status: 'invalid_key' }
  }
})

fastify.post('/license/activate', async (request) => {
  const body = JSON.parse(request.body)
  if (!body.licenseKey) {
    return { success: false, status: 'empty_license_key' }
  }
  if (!body.userId) {
    return { success: false, status: 'empty_user_id' }
  }
  const response = await sendRequest('licenses/activate', 'POST', {
    license_key: body.licenseKey,
    instance_name: body.userId,
  })
  if (response.activated) {
    return { success: true, status: 'ok', instanceId: response.instance.id }
  }
  if (
    response.license_key &&
    response.license_key.activation_limit ===
      response.license_key.activation_usage
  ) {
    return { success: false, status: 'already_active' }
  }
  return { success: false, status: 'invalid_key' }
})

fastify.post('/license/deactivate', async function handler(request, reply) {
  const body = JSON.parse(request.body)
  if (!body.licenseKey) {
    return { success: false, status: 'empty_license_key' }
  }
  if (!body.instanceId) {
    return { success: false, status: 'empty_instance_id' }
  }
  const response = await sendRequest('licenses/deactivate', 'POST', {
    license_key: body.licenseKey,
    instance_id: body.instanceId,
  })
  if (!response.deactivated) {
    // TODO: add status
    return { success: false, status: response.error }
  }
  return { success: true, status: 'ok' }
})

fastify.post('/feedback', async function handler(request, reply) {
  const { userId, rating, message } = request.body

  if (!userId || !rating) {
    return reply.status(400).send({ error: 'userId and rating are required' })
  }

  try {
    const result = await client.query(
      `
      INSERT INTO feedback (user_id, rating, message)
      VALUES ($1, $2, $3)
      RETURNING *;
      `,
      [userId, rating, message],
    )

    return reply.status(201).send(result.rows[0])
  } catch (error) {
    fastify.log.error(error)
    return reply.status(500).send({ error: 'Failed to save feedback' })
  }
})

try {
  await initializeDatabase()
  await fastify.listen({ host: host, port: PORT })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
