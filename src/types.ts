import * as o from 'fp-ts/lib/Option'

export const string = (input: unknown): o.Option<string> =>
  typeof input === "string" ? o.some(input) : o.none
