import Fastify from 'fastify'
const fastify = Fastify({
  logger: true,
})

fastify.get('/', async function handler(request, reply) {
  const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    body: JSON.stringify({ apiKey: request.body.apiKey }),
  })
  return await response.json()
})

try {
  await fastify.listen({ port: 3000 })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
