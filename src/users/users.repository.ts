import * as o from "fp-ts/lib/Option";
import * as te from "fp-ts/lib/TaskEither";
import { Collection, ObjectId } from "mongodb";

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

const findOne = (id: MongoId) => (collection: Collection<Record<string, unknown>>) =>
  te.tryCatch(
    () => collection.findOne({ id: new ObjectId(id) }),
    repositoryError
  );

export const findById = (id: MongoId) => (
  collection: Collection<Record<string, unknown>
): te.TaskEither<RepositoryError, o.Option<User>> => {
  pipe(
    findOne(id)(collection),
    te.chain(dbResult => {
      if (dbResult === null) return te.right(o.none)

      // TODO create parseUser
      return parseUser(dbResult)
    })
  )
};
