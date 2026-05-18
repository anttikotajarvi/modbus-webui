import { createEmptyLibrary } from "@/sys/library/defaults";
import type { PersistenceActions } from "./persistence";
import type { SvimmerWriter } from "svimmer-store";
import type { LibraryData } from "@/sys/library/types";
import { useAlert } from "@/ui/alert/context";
import { openFiles } from "@/sys/generic/open-file";
const alert = useAlert();

export function primeConsoleCommands(persistenceActions: PersistenceActions, lib: SvimmerWriter<LibraryData>, persistLibrary: () => void) {
  const consoleCommands = {
    resetStorage: () => {
      lib.set(createEmptyLibrary())
      void persistLibrary()
      alert.success('Storage reset to default state.')
    },

    printLibraryToConsole: () => {
      console.log('Current library state:', lib.value())
      alert.info('Library state printed to console.')
    },

    exportLibrary: () => {
      // Data straight from localStorage
      persistenceActions.exportLibrary()
    },

    importLibrary: (json: string) => {
      try {
        persistenceActions.importLibrary(json)
      } catch (err) {
        console.error('Import failed:', err)
        const msg = err instanceof Error ? err.message : String(err)
        alert.error(`Import failed: ${msg}`)
      }
    },

    importLibraryFromFile: async () => {
      try {
        const file = await openFiles({
          accept: ['.json', 'application/json'],
          multiple: false,
        })
        if (!file) return

        const text = await file.text()
        persistenceActions.importLibrary(text)
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return // user canceled
        console.error('Import picker failed:', err)
        const msg = err instanceof Error ? err.message : String(err)
        alert.error(`Import failed: ${msg}`)
      }
    },
  }
  // expose to window early so it works even if UI fails later
  ;(globalThis as any).MB_APP ??= {}
  Object.assign((globalThis as any).MB_APP, consoleCommands)
}
