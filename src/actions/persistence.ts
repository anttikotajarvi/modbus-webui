import type { LibraryData } from "@/sys/library/types";

export interface PersistenceActions {
  saveLibrary(): void,
  setLibrary(data: LibraryData): void;
  importLibrary(data: string): void;
  exportLibrary(): void;
}

