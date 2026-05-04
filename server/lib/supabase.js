const { createClient } = require('@supabase/supabase-js')

// ── Lazy singleton so the client is only built once and only when needed ──
let _supabase = null

function getClient() {
  if (_supabase) return _supabase

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Storage service is not configured. ' +
      'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
    )
  }

  _supabase = createClient(url, key, {
    auth: { persistSession: false }, // serverless — no session persistence
  })
  return _supabase
}

// Warn at startup if credentials are missing (non-fatal, uploads will surface the error)
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Supabase credentials missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). Media uploads will fail.')
}

/**
 * Uploads a file buffer to Supabase Storage.
 * @param {Buffer} buffer       - File buffer from multer memoryStorage
 * @param {string} fileName     - Destination path inside the bucket (e.g. "kyc/userId/front.jpg")
 * @param {string} contentType  - MIME type (e.g. "image/jpeg")
 * @returns {Promise<string>}   - Public URL of the uploaded file
 */
async function uploadToSupabase(buffer, fileName, contentType) {
  const supabase = getClient() // throws if credentials missing
  const bucket   = process.env.SUPABASE_BUCKET || 'novatrix'

  console.log(`[Supabase] Uploading ${fileName} (${(buffer.length / 1024).toFixed(1)} KB) → bucket:${bucket}`)

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, buffer, {
      contentType: contentType || 'application/octet-stream',
      upsert: true, // Allow re-upload on same path (e.g. KYC resubmission)
    })

  if (error) {
    // Surface the full Supabase error (statusCode, message, error name)
    const detail = `[${error.statusCode ?? error.status ?? '?'}] ${error.error ?? ''} — ${error.message ?? 'unknown'}`
    console.error(`[Supabase Upload Failed] ${fileName}: ${detail}`)
    throw new Error(`Upload failed: ${detail}`)
  }

  // Build the public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName)

  console.log(`[Supabase] Upload OK → ${publicUrl}`)
  return publicUrl
}

/**
 * Deletes one or more files from Supabase Storage.
 * @param {string[]} paths  - Array of file paths inside the bucket
 */
async function deleteFromSupabase(paths) {
  try {
    const supabase = getClient()
    const bucket   = process.env.SUPABASE_BUCKET || 'novatrix'
    const { error } = await supabase.storage.from(bucket).remove(paths)
    if (error) console.error('[Supabase Delete Failed]:', error.message)
  } catch (err) {
    console.error('[Supabase Delete Skipped]:', err.message)
  }
}

// Named export for direct use (e.g. listing buckets, admin queries)
function getSupabase() { return getClient() }

module.exports = { getSupabase, uploadToSupabase, deleteFromSupabase }
