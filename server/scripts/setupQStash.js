require('dotenv').config()

async function setupQStash() {
  console.log('🚀 Starting Upstash QStash configuration...')

  const qstashToken = process.env.QSTASH_TOKEN
  const appUrl      = process.env.APP_URL
  const cronSecret  = process.env.CRON_SECRET

  if (!qstashToken) {
    console.error('❌ Error: QSTASH_TOKEN is not set in your .env file.')
    process.exit(1)
  }
  if (!appUrl) {
    console.error('❌ Error: APP_URL is not set in your .env file (e.g. https://novatrix-server.vercel.app).')
    process.exit(1)
  }
  if (!cronSecret) {
    console.error('❌ Error: CRON_SECRET is not set in your .env file.')
    process.exit(1)
  }

  const qstashUrl   = process.env.QSTASH_URL || 'https://qstash-us-east-1.upstash.io'
  const destination = `${appUrl}/api/cron/queue-roi`
  const scheduleUrl = `${qstashUrl}/v2/schedules/${destination}`

  console.log(`- Destination Target: ${destination}`)
  console.log(`- Schedule: Daily at 12:00 AM (Asia/Kolkata timezone)`)

  try {
    const response = await fetch(scheduleUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${qstashToken}`,
        'Content-Type': 'application/json',
        'Upstash-Cron': '0 0 * * *',
        'Upstash-Cron-Timezone': 'Asia/Kolkata',
        'Upstash-Forward-Authorization': `Bearer ${cronSecret}`
      },
      body: JSON.stringify({ triggeredBy: 'qstash-scheduler' })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ QStash API failed: ${response.status} - ${errorText}`)
      process.exit(1)
    }

    const data = await response.json()
    console.log('✅ QStash Schedule Created/Updated successfully!')
    console.log('Schedule Details:', data)
  } catch (error) {
    console.error('❌ Network error contacting QStash API:', error.message)
    process.exit(1)
  }
}

setupQStash()
