import * as o from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function';
import validator from 'validator'
import { ObjectId } from 'mongodb'

export const string = (input: unknown): o.Option<string> =>
  typeof input === "string" ? o.some(input) : o.none

export type Email = string & { __Email__: never };

export const email = (input: unknown): o.Option<Email> =>
  pipe(
    string(input),
    o.chain((str) => (validator.isEmail(str) ? o.some(str as Email) : o.none))
  );

export type URL = string & { __Url__: never };

export const url = (input: unknown): o.Option<URL> =>
  pipe(
    string(input),
    o.chain((str) => (validator.isURL(str) ? o.some(str as URL) : o.none))
  );

export type MongoId = string & { __MongoId__: never };

export const mongoId = (input: unknown): o.Option<MongoId> =>
  pipe(
    string(input),
    o.chain((str) => (ObjectId.isValid(str) ? o.some(str as MongoId) : o.none))
  );

