const readFunctions = [
  'read_input_registers',
  'read_holding_registers',
  'read_coils',
  'read_discrete_inputs',
] as const

type ReadResponse = {
  fromFunction: ReadFunction
  startAddress: number
  data: number[] | boolean[]
}
type ReadPanelProps = {
  getData: (query: ReadQuery) => Promise<ReadResponse>
}
type ReadFunction = (typeof readFunctions)[number]
type ReadQuery = {
  type: ReadFunction
  address: number
  quantity: number
}
type ReadMethod = (query: ReadQuery) => Promise<ReadResponse>
type RPanelSettings = {
  autoRefreshInterval: number
  autoRefresh: boolean
  queryTemplate: ReadQuery
}
const regPrefixes: Record<ReadFunction | WriteFunction, string> = {
  read_holding_registers: 'HR',
  read_input_registers: 'IR',
  read_coils: 'CR',
  read_discrete_inputs: 'DI',
  write_coils: 'C',
  write_registers: 'HR',
}
export type { ReadPanelProps, ReadFunction, ReadQuery, RPanelSettings, ReadResponse, ReadMethod }
export { readFunctions, regPrefixes }

// -------------------------------------------------------------
// Write functions 
// -------------------------------------------------------------
const writeFunctions = ['write_coils', 'write_registers'] as const
type WriteFunction = (typeof writeFunctions)[number]

// For persisting shortcuts
// This should probably be moved to the other types that the library is dependent on
type WriteQuery = {
    type: WriteFunction
    address: number
    values: number[] | boolean[]
}
// These are included in library as shortcuts so we need to ensure 
//   the type matches the current schema implementation.
import type { Expect, SchemaEqual } from '@/types/generic'
import type { writeQuerySchema } from '../library/versions/current'
import type { NametableCategory } from '../library/types'
type _check_writeQuery = Expect<SchemaEqual<typeof writeQuerySchema, WriteQuery>>

type WriteResponse = {
  fromFunction: WriteFunction
  address: number
  quantity: number
}

export type { WriteFunction, WriteQuery, WriteResponse }
export { writeFunctions }


// -------------------------------------------------------------
// Helpers 
// -------------------------------------------------------------
export const nametableCategoryFromFunctionType: Record<WriteFunction | ReadFunction, NametableCategory> = {
  read_input_registers: "iregs",
  read_holding_registers: "hregs",
  read_coils: "coils",
  read_discrete_inputs: "dinputs",
  write_registers: "hregs",
  write_coils: "coils",
};
export const registerLabels: Record<NametableCategory, string> = {
    hregs: 'Holding Registers',
    iregs: 'Input Registers',
    coils: 'Coils',
    dinputs: 'Discrete Inputs',
  }
