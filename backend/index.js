import Fastify from 'fastify'

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
  await fastify.listen({ port: process.env.PORT || 3000 })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
