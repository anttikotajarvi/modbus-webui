import { z } from "zod/v4-mini";

export type Versioned<V extends number, T> = {
  version: V;
  data: T;
};
export const versionedSchema = z.object({
  version: z.uint32(),
  data: z.any()
})

export type Migration<
  FromV extends number,
  From,
  ToV extends number,
  To,
> = {
  from: FromV;
  to: ToV;
  migrate: (value: Versioned<FromV, From>) => Versioned<ToV, To>;
};

export type AnyMigration = Migration<number, unknown, number, unknown>;

type FromValue<M extends AnyMigration> =
  M extends Migration<infer FV, infer F, any, any>
    ? Versioned<FV, F>
    : never;

type ToValue<M extends AnyMigration> =
  M extends Migration<any, any, infer TV, infer T>
    ? Versioned<TV, T>
    : never;

export function defineMigration<
  FromV extends number,
  From,
  ToV extends number,
  To,
>(
  migration: Migration<FromV, From, ToV, To>,
): Migration<FromV, From, ToV, To> {
  return migration;
}

export function applyMigration<M extends AnyMigration>(
  migration: M,
  value: FromValue<M>,
): ToValue<M> {
  return migration.migrate(value) as ToValue<M>;
}
