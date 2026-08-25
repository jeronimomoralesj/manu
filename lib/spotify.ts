export function extractTrackId(input: string): string | null {
  if (!input) return null
  // https://open.spotify.com/track/ID?si=...
  const urlMatch = input.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/)
  if (urlMatch) return urlMatch[1]
  // spotify:track:ID
  const uriMatch = input.match(/spotify:track:([A-Za-z0-9]+)/)
  if (uriMatch) return uriMatch[1]
  return null
}

export function getEmbedUrl(spotifyInput: string): string | null {
  const id = extractTrackId(spotifyInput)
  if (!id) return null
  return `https://open.spotify.com/embed/track/${id}?utm_source=generator&theme=0`
}

export function getCoverFromOembed(spotifyInput: string): string {
  const id = extractTrackId(spotifyInput)
  if (!id) return ''
  return `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${id}`
}
