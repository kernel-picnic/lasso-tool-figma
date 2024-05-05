import { Mutable } from '@common/types/mutable'

export const deepClone = <T>(obj: Record<any, any>): Mutable<T> => {
  return JSON.parse(JSON.stringify(obj))
}
