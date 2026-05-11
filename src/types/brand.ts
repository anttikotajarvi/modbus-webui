export declare const BRAND: unique symbol;

export type Brand<T, Tag extends string> = T & {
  readonly [BRAND]: Tag;
};

type BrandMarker = {
  readonly [BRAND]: unknown;
};

type UnbrandKey<T> =
  T extends string ? (T extends BrandMarker ? string : T) :
  T extends number ? (T extends BrandMarker ? number : T) :
  T extends symbol ? (T extends BrandMarker ? symbol : T) :
  T extends PropertyKey ? T :
  never;

export type Unbrand<T> =
  T extends string ? (T extends BrandMarker ? string : T) :
  T extends number ? (T extends BrandMarker ? number : T) :
  T extends boolean ? (T extends BrandMarker ? boolean : T) :
  T extends bigint ? (T extends BrandMarker ? bigint : T) :
  T extends symbol ? (T extends BrandMarker ? symbol : T) :

  T extends Map<infer K, infer V> ? Map<UnbrandKey<K>, Unbrand<V>> :
  T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<UnbrandKey<K>, Unbrand<V>> :
  T extends Set<infer U> ? Set<Unbrand<U>> :
  T extends ReadonlySet<infer U> ? ReadonlySet<Unbrand<U>> :

  // mutable arrays first
  T extends [any, ...any[]] ? { [K in keyof T]: Unbrand<T[K]> } :
  T extends [] ? [] :
  T extends (infer E)[] ? Unbrand<E>[] :

  // readonly arrays after
  T extends readonly [any, ...any[]] ? { readonly [K in keyof T]: Unbrand<T[K]> } :
  T extends readonly [] ? readonly [] :
  T extends readonly (infer E)[] ? readonly Unbrand<E>[] :

  T extends object
    ? { [K in keyof T as K extends typeof BRAND ? never : UnbrandKey<K>]: Unbrand<T[K]> }
    : T;