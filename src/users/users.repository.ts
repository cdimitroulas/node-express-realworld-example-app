import * as e from "fp-ts/lib/Either";
import * as o from "fp-ts/lib/Option";
import * as te from "fp-ts/lib/TaskEither";
import { Collection, ObjectId } from "mongodb";

import { parseUser, UserParsingError } from "./parsing";
import { User } from "./user.model";
import { MongoId } from "../types";
import {pipe} from "fp-ts/lib/function";

type RepositoryError = {
  __tag: "RepositoryError";
  error: unknown;
};

const repositoryError = (error: unknown) => ({
  __tag: "RepositoryError" as const,
  error,
});

type Document = Record<string, unknown> & { _id: ObjectId }

const findOne = (id: MongoId) => (collection: Collection<Document>) =>
  te.tryCatch(
    () => collection.findOne({ id: new ObjectId(id) }),
    repositoryError
  );

export const findById = (id: MongoId) => (
  collection: Collection<Document>
): te.TaskEither<RepositoryError | UserParsingError, o.Option<User>> => {
  return pipe(
    findOne(id)(collection),
    te.chainW(dbResult => {
      if (dbResult === null) return te.right(o.none)

      return pipe(
        parseUser(dbResult),
        e.map(o.some),
        te.fromEither
      )
    })
  )
};
