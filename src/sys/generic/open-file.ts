export type OpenFileOptions = {
  accept?: string | readonly string[]
}

function normalizeAccept(accept: OpenFileOptions['accept']): string | undefined {
  if (!accept) return undefined
  return typeof accept === 'string'
    ? accept
    : accept.join(',')
}

export function openFiles(options: OpenFileOptions & { multiple: true }): Promise<File[]>
export function openFiles(options?: OpenFileOptions & { multiple?: false }): Promise<File | null>
export function openFiles(
  options: OpenFileOptions & { multiple?: boolean } = {},
): Promise<File | File[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')

    input.type = 'file'
    input.multiple = options.multiple ?? false

    const accept = normalizeAccept(options.accept)
    if (accept) {
      input.accept = accept
    }

    input.style.position = 'fixed'
    input.style.left = '-9999px'
    input.style.opacity = '0'

    let settled = false

    function cleanup() {
      input.remove()
      window.removeEventListener('focus', handleFocus)
    }

    function settle(value: File | File[] | null) {
      if (settled) return
      settled = true
      cleanup()
      resolve(value)
    }

    function readFiles() {
      const files = Array.from(input.files ?? [])

      if (options.multiple) {
        settle(files)
      } else {
        settle(files[0] ?? null)
      }
    }

    function handleFocus() {
      setTimeout(() => {
        if (!settled && (!input.files || input.files.length === 0)) {
          settle(options.multiple ? [] : null)
        }
      }, 250)
    }

    input.addEventListener('change', readFiles, { once: true })
    input.addEventListener('cancel', () => settle(options.multiple ? [] : null), { once: true })

    document.body.appendChild(input)

    setTimeout(() => {
      window.addEventListener('focus', handleFocus)
    }, 0)

    input.click()
  })
}