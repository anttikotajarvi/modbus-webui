export function exportFile(filename: string, data: Blob) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // revoke on next tick to avoid aborting downloads in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
