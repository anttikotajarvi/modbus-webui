// Ask browser to persist storage (best-effort)
export async function requestPersistence() {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try { await navigator.storage.persist(); } catch (e) {
      console.warn("Failed to request storage persistence:", e);
    }
  }
}