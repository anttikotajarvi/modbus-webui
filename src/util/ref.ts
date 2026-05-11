// ref.ts
export type Ref<T> = {
  get(): T;
  set(value: T): void;
  update(fn: (value: T) => T): void;
};

export function makeRef<T>(initialValue: T): Ref<T> {
  let value = initialValue;

  return {
    get() {
      return value;
    },

    set(next) {
      value = next;
    },

    update(fn) {
      value = fn(value);
    },
  };
}