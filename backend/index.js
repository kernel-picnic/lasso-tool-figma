import Fastify from 'fastify'

const API_URL = 'https://api.gumroad.com/v2/'
const PORT = process.env.PORT || 3000
const host = 'RENDER' in process.env ? `0.0.0.0` : `localhost`

const fastify = Fastify({
  logger: true,
})

async function sendRequest(url, method = 'GET', data) {
  const response = await fetch(`${API_URL}/${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, product_id: process.env.PRODUCT_ID }),
  })
  const json = await response.json()
  fastify.log.info(json)
  return json
}

fastify.post('/verify-license-key', async function handler(request, reply) {
  // TODO: move CORS to global middleware
  reply.header('Access-Control-Allow-Origin', '*')
  reply.header('Access-Control-Allow-Methods', 'POST')

  const body = JSON.parse(request.body)
  const payload = {
    license_key: body.licenseKey,
  }

  const response = await sendRequest('/licenses/verify', 'POST', {
    ...payload,
    increment_uses_count: false,
  })

  if (!response.success) {
    return { success: false, status: 'invalid_key' }
  }

  if (body.incrementUsesCount) {
    if (response.uses !== 0) {
      return { success: false, status: 'already_in_use' }
    }
    // Increment uses count
    await sendRequest('/licenses/verify', 'POST', {
      ...payload,
      increment_uses_count: true,
    })
  }

  return { success: true, status: 'success' }
})

fastify.post('/detach-license-key', async function handler(request, reply) {
  reply.header('Access-Control-Allow-Origin', '*')
  reply.header('Access-Control-Allow-Methods', 'POST')

  const body = JSON.parse(request.body)
  const response = await sendRequest('/licenses/decrement_uses_count', 'PUT', {
    access_token: process.env.ACCESS_TOKEN,
    license_key: body.licenseKey,
  })
  return { success: response.success, message: response.message }
})

try {
  await fastify.listen({ host: host, port: PORT })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
