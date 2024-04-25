import Fastify from 'fastify'

const API_URL = 'https://api.gumroad.com/v2/'
const PORT = process.env.PORT || 3000
const host = 'RENDER' in process.env ? `0.0.0.0` : `localhost`

const fastify = Fastify({
  logger: true,
})

fastify.post('/verify-license-key', async function handler(request, reply) {
  // TODO: move CORS to global middleware
  reply.header('Access-Control-Allow-Origin', '*')
  reply.header('Access-Control-Allow-Methods', 'POST')

  let status = 'success'

  const body = JSON.parse(request.body)
  const response = await fetch(`${API_URL}/licenses/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: process.env.PRODUCT_ID,
      license_key: body.licenseKey,
      increment_uses_count: false,
    }),
  })
  const data = await response.json()
  if (body.incrementUsesCount && !data.uses) {
    // Increment uses count
    await fetch(`${API_URL}/licenses/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: process.env.PRODUCT_ID,
        license_key: body.licenseKey,
        increment_uses_count: true,
      }),
    })
  } else {
    status = 'already_in_use'
  }
  if (!data.success) {
    status = 'invalid_key'
  }
  return { success: data.success, status }
})

fastify.post('/detach-license-key', async function handler(request, reply) {
  reply.header('Access-Control-Allow-Origin', '*')
  reply.header('Access-Control-Allow-Methods', 'POST')

  const body = JSON.parse(request.body)
  const response = await fetch(`${API_URL}/licenses/decrement_uses_count`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: process.env.ACCESS_TOKEN,
      product_id: process.env.PRODUCT_ID,
      license_key: body.licenseKey,
    }),
  })
  const data = await response.json()
  return { success: data.success, message: data.message }
})

try {
  await fastify.listen({ host: host, port: PORT })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
