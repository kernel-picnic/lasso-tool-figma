import Fastify from 'fastify'

const PORT = process.env.PORT || 3000
const host = 'RENDER' in process.env ? `0.0.0.0` : `localhost`

const fastify = Fastify({
  logger: true,
})

// TODO: CORS

fastify.post('/verify-license-key', async function handler(request, reply) {
  const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    body: JSON.stringify({
      product_id: process.env.PRODUCT_ID,
      license_key: request.body.apiKey,
    }),
  })
  return await response.json()
})

try {
  await fastify.listen({ host: host, port: PORT })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
