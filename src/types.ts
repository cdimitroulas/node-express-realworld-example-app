import * as Arr from "fp-ts/lib/Array";
import * as o from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/function";
import isPlainObject from "lodash.isplainobject";
import validator from "validator";
import { ObjectId } from "mongodb";

type TypeConstructor<T> = (input: unknown) => o.Option<T>;

export const array = (input: unknown): o.Option<unknown[]> =>
  Array.isArray(input) ? o.some(input) : o.none;

export const arrayOf = <T>(typeConst: TypeConstructor<T>) => (
  input: unknown[]
): o.Option<T[]> => Arr.sequence(o.option)(input.map(typeConst));

export const number = (input: unknown): o.Option<number> =>
  typeof input === "number" ? o.some(input) : o.none;

export const string = (input: unknown): o.Option<string> =>
  typeof input === "string" ? o.some(input) : o.none;

export const unknownObject = (
  input: unknown
): o.Option<Record<string, unknown>> =>
  isPlainObject(input) ? o.some(input as Record<string, unknown>) : o.none;

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
    o.chain((str) => (ObjectId.isValid(str) ? o.some(str as MongoId) : o.none)),
    o.fold(
      () =>
        input instanceof ObjectId
          ? o.some(input.toString() as MongoId)
          : o.none,
      o.some
    )
  );

export const generateMongoId = (): MongoId => new ObjectId().toString() as MongoId
