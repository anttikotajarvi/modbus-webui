import type { Nametable } from '@/sys/library/types'

type NameEntry = [number, string]
type SerializableNametable = {
  iregs: NameEntry[]
  hregs: NameEntry[]
  coils: NameEntry[]
  dinputs: NameEntry[]
}
export const toSerializableNametable = (nt: Nametable): SerializableNametable => {
  return {
    iregs: Array.from(nt.iregs.entries()),
    hregs: Array.from(nt.hregs.entries()),
    coils: Array.from(nt.coils.entries()),
    dinputs: Array.from(nt.dinputs.entries()),
  }
}
export const fromSerializedNametable = (snt: SerializableNametable): Nametable => {
  return {
    iregs: new Map<number, string>(snt.iregs),
    hregs: new Map<number, string>(snt.hregs),
    coils: new Map<number, string>(snt.coils),
    dinputs: new Map<number, string>(snt.dinputs),
  }
}

export const toNametableString = (data: Nametable) => {
  const ser = data
  const order = ['hregs', 'iregs', 'coils', 'dinputs'] as const

  const out: string[] = ['{']
  /**
   * This is all to keep the json formatted as:
   *   "hregs": [
   *      [0, "first"],
   *      [1, "second"]
   *   ],
   * instead of:
   *    "iregs": [
   *      [
   *        0,
   *        "first"
   *      ],
   *      [
   *        1,
   *        "second"
   *      ]
   *   ],
   */
  order.forEach((k, i) => {
    // ensure stable numeric ordering
    const entries = [...ser[k]].sort((a, b) => a[0] - b[0])
    const isLastProp = i === order.length - 1

    if (entries.length === 0) {
      out.push(`  "${k}": []${isLastProp ? '' : ','}`)
    } else {
      out.push(`  "${k}": [`)
      for (let j = 0; j < entries.length; j++) {
        const [addr, name] = entries[j]
        const isLast = j === entries.length - 1
        out.push(`    [${addr}, ${JSON.stringify(name)}]${isLast ? '' : ','}`)
      }
      out.push(`  ]${isLastProp ? '' : ','}`)
    }
  })

  out.push('}')
  return out.join('\n')
}
export const fromNametableString = (str: string): Nametable => fromSerializedNametable(JSON.parse(str))