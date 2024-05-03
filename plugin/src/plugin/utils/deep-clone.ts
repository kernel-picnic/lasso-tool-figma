type Mutable<T> = {
  -readonly [k in keyof T]: T[k]
}

export const deepClone = <T>(obj: Record<any, any>): Mutable<T> => {
  return JSON.parse(JSON.stringify(obj))
}
