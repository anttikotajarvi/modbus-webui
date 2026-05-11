import {
  SCRATCH_ID,
  type ConnectionSettings,
  type LibraryData,
  type Nametable,
  type ProfileData,
} from './types'

export const defaultConnectionSettings = (): ConnectionSettings => {
  return {
    deviceId: 1,
    options: {
      // Default 8N1
      baudRate: 9600,
      dataBits: 8,
      parity: 'none',
      stopBits: 1,
      crcPolicy: {
        mode: 'resync',
        maxResyncDrops: 10,
      },
      postTimeoutWaitPeriod: 20,
      timeout: 20,
      interRequestDelay: 3,
    },
  }
}
export const createEmptyProfile = (): ProfileData => {
  return {
    activeNametable: null,
    layout: [],
    connectionSettings: defaultConnectionSettings(),
    writeShortcuts: {},
    updatedAt: Date.now(),
  }
}
export const createExampleNametable = (): Nametable => {
  return {
    iregs: new Map([
      [0, 'First IReg'],
      [1, 'Second IReg'],
    ]),
    hregs: new Map([
      [0, 'First HReg'],
      [1, 'Second HReg'],
    ]),
    coils: new Map([
      [0, 'First Coil'],
      [1, 'Second Coil'],
    ]),
    dinputs: new Map([
      [0, 'First DInput'],
      [1, 'Second DInput'],
    ]),
  }
}
export const createEmptyNametable = (): Nametable => {
  return  {
    iregs: new Map(),
    hregs: new Map(),
    coils: new Map(),
    dinputs: new Map()
  }
}

export function ensureScratchProfile(lib: LibraryData): void {
  if (!lib.profiles[SCRATCH_ID]) {
    lib.profiles[SCRATCH_ID] = createEmptyProfile()
  }
}
export const createEmptyLibrary = () => {
  const lib = {
    nametables: {},
    profiles: {},
    activeProfileTag: null,
  } as LibraryData

  // Very important to ensure scratch profile.
  ensureScratchProfile(lib)

  return lib
}
