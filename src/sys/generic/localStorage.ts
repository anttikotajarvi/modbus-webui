import { useAlert } from '@/ui/alert/context'

const alert = useAlert()

// Ask browser to persist storage (best-effort)
export async function requestPersistence() {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      await navigator.storage.persist()
    } catch (e) {
      console.warn('Failed to request storage persistence:', e)
      const msg = e instanceof Error ? e.message : String(e)
      alert.error('Failed to request storage persistence', msg)
    }
  }
}
