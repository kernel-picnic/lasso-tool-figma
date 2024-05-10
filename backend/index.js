import Fastify from 'fastify'

const API_URL = 'https://api.lemonsqueezy.com/v1'
const PORT = process.env.PORT || 3000
const host = 'RENDER' in process.env ? `0.0.0.0` : `localhost`

const fastify = Fastify({
  logger: true,
})

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
    response.activation_limit &&
    response.activation_limit === response.activation_usage
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

try {
  await fastify.listen({ host: host, port: PORT })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}
