type NumberWriter<T extends number> = {
  set(value: T): void;
};

export function setNumber<T extends number>(ref: NumberWriter<T>) {
  return (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;

    if (input.value === "") return;

    const value = input.valueAsNumber;
    if (!Number.isFinite(value)) return;

    ref.set(value as T);
  };
}