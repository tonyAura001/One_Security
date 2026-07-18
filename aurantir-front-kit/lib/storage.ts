'use client'

// Images are already compressed formats — skip gzip for them
const IS_IMAGE = /^image\//

export function shouldCompress(file: File): boolean {
  return !IS_IMAGE.test(file.type)
}

async function gzipBlob(data: ArrayBuffer): Promise<Blob> {
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(new Uint8Array(data))
  writer.close()
  return new Response(cs.readable).blob()
}

async function ungzipBlob(blob: Blob): Promise<Blob> {
  const ds = new DecompressionStream('gzip')
  const writer = ds.writable.getWriter()
  writer.write(new Uint8Array(await blob.arrayBuffer()))
  writer.close()
  return new Response(ds.readable).blob()
}

/**
 * Compress (if not an image) and upload to Supabase Storage.
 * Returns the final stored path — adds ".gz" suffix for compressed files.
 */
export async function uploadToStorage(
  supabase: any,
  bucket: string,
  path: string,
  file: File,
  options?: Record<string, unknown>
): Promise<{ storedPath: string; error: any }> {
  if (!shouldCompress(file)) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, options)
    return { storedPath: path, error }
  }
  const compressed = await gzipBlob(await file.arrayBuffer())
  const storedPath = path + '.gz'
  const { error } = await supabase.storage.from(bucket).upload(storedPath, compressed, options)
  return { storedPath, error }
}

/**
 * Download from a private bucket (signed URL), decompress if needed, trigger download.
 */
export async function downloadFromStorage(
  supabase: any,
  bucket: string,
  storedPath: string,
  fileName: string,
  expiresIn = 60
): Promise<void> {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(storedPath, expiresIn)
  if (!data?.signedUrl) return
  await _download(data.signedUrl, storedPath, fileName)
}

/**
 * Download from a public URL, decompress if needed, trigger download.
 */
export async function downloadFromPublicUrl(
  publicUrl: string,
  fileName: string
): Promise<void> {
  await _download(publicUrl, publicUrl, fileName)
}

/**
 * Extracts the storage object path from either a stored path or a legacy
 * full public URL (".../storage/v1/object/public/<bucket>/<path>").
 */
export function resolveStoragePath(bucket: string, urlOrPath: string): string {
  const marker = `/storage/v1/object/public/${bucket}/`
  return urlOrPath.includes(marker) ? urlOrPath.split(marker)[1] : urlOrPath
}

/**
 * Download a document stored under `bucket`, accepting either a stored path
 * (new format) or a legacy full public URL, via a signed URL.
 */
export async function downloadDocument(
  supabase: any,
  bucket: string,
  urlOrPath: string,
  fileName: string,
  expiresIn = 60
): Promise<void> {
  await downloadFromStorage(supabase, bucket, resolveStoragePath(bucket, urlOrPath), fileName, expiresIn)
}

async function _download(fetchUrl: string, storedPath: string, fileName: string) {
  let blob = await fetch(fetchUrl).then(r => r.blob())
  if (storedPath.endsWith('.gz')) blob = await ungzipBlob(blob)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
