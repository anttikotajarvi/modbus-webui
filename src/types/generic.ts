import type { z } from "zod/v4-mini";

export type Expect<T extends true> = T;
export type Equal<A, B> =
  [A] extends [B]
    ? ([B] extends [A] ? true : false)
    : false;

export type Result<T, E extends Error = Error> =
  | {
      val: T
      err: null
    }
  | {
      val: null
      err: E
    }

export const ok = <T>(val: T): Result<T> => ({
  val,
  err: null,
})

export const resErr = <E extends Error>(err: E): Result<never, E> => ({
  val: null,
  err,
})

// Type x schema validation
export type SchemaEqual<
  Schema extends z.ZodMiniType,
  Type
> = Equal<z.infer<Schema>, Type>;