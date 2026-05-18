export function sv<T>(value: T) {
  return $state.snapshot(value) as T;
}