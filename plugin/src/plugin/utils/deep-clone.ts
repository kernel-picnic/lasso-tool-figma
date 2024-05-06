import { Mutable } from '@common/types/mutable'

export const deepClone = <T>(obj: any): Mutable<T> => {
  return JSON.parse(JSON.stringify(obj))
}
