/**
 * Path<T> — Generates a union of all possible string paths for a given object T.
 */
export type Path<T> = T extends object
    ? {
          [K in keyof T]: K extends string
              ? T[K] extends object
                  ? `${K}` | `${K}.${Path<T[K]>}`
                  : `${K}`
              : never;
      }[keyof T]
    : never;

/**
 * PathValue<T, P> — Extracts the type of the value at path P in object T.
 */
export type PathValue<T, P extends string> = P extends `${infer K}.${infer R}`
    ? K extends keyof T
        ? PathValue<T[K], R>
        : unknown
    : P extends keyof T
    ? T[P]
    : unknown;

/**
 * getDeepValue — Strictly-typed deep property accessor.
 */
export function getDeepValue<T, P extends Path<T>>(obj: T, path: P): PathValue<T, P> {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
        if (current === null || current === undefined) return undefined as unknown as PathValue<T, P>;
        current = (current as Record<string, unknown>)[part];
    }
    return current as PathValue<T, P>;
}

/**
 * setDeepValue — Strictly-typed deep property setter.
 */
export function setDeepValue<T extends object, P extends Path<T>>(obj: T, path: P, value: PathValue<T, P>): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = obj as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) current[part] = {};
        current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
}
