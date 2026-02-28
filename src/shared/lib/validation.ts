export function validateFile(file: File): string | null {
  if (!file.type.startsWith('video/')) {
    return `File "${file.name}" does not appear to be a video.`
  }
  return null
}
