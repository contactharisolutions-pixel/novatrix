const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase credentials missing. Media uploads will fail.')
}

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Uploads a file buffer to Supabase Storage.
 * @param {Buffer} buffer       - File buffer from multer memoryStorage
 * @param {string} fileName     - Destination path inside the bucket (e.g. "kyc/userId/front.jpg")
 * @param {string} contentType  - MIME type (e.g. "image/jpeg")
 * @returns {Promise<string>}   - Public URL of the uploaded file
 */
async function uploadToSupabase(buffer, fileName, contentType) {
  const bucket = process.env.SUPABASE_BUCKET || 'novatrix'

  console.log(`[Supabase] Uploading ${fileName} (${(buffer.length / 1024).toFixed(1)} KB) → bucket:${bucket}`)

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, buffer, {
      contentType: contentType || 'application/octet-stream',
      upsert:      true,   // Allow re-upload on same path (e.g. KYC resubmission)
    })

  if (error) {
    // Surface the full Supabase error (statusCode, message, error name)
    const detail = `[${error.statusCode ?? '?'}] ${error.error ?? ''} — ${error.message ?? 'unknown'}`
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
  const bucket = process.env.SUPABASE_BUCKET || 'novatrix'
  const { error } = await supabase.storage.from(bucket).remove(paths)
  if (error) console.error('[Supabase Delete Failed]:', error.message)
}

module.exports = { supabase, uploadToSupabase, deleteFromSupabase }
