import Fastify from 'fastify'
import { fastifyEnv } from '@fastify/env'

const fastify = Fastify({
  logger: true,
})
await fastify.register(fastifyEnv, {
  dotenv: true,
  schema: {
    type: 'object',
    required: ['PORT', 'PRODUCT_ID'],
    properties: {
      PORT: {
        type: 'string',
        default: 3000,
      },
      PRODUCT_ID: {
        type: 'string',
        default: '',
      },
    },
  },
})

// TODO: CORS

fastify.post('/verify-license-key', async function handler(request, reply) {
  const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    body: JSON.stringify({
      product_id: fastify.config.PRODUCT_ID,
      license_key: request.body.apiKey,
    }),
  })
  return await response.json()
})

try {
  await fastify.listen({ port: fastify.config.PORT })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
