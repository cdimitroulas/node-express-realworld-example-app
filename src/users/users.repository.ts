import * as e from "fp-ts/lib/Either";
import * as o from "fp-ts/lib/Option";
import * as te from "fp-ts/lib/TaskEither";
import { Collection, ObjectId } from "mongodb";

import { parseUser, UserParsingError } from "./parsing";
import { User } from "./user.model";
import { MongoId, Email } from "../types";
import { pipe } from "fp-ts/lib/function";

type RepositoryError = {
  __tag: "RepositoryError";
  error: unknown;
};

const repositoryError = (error: unknown) => ({
  __tag: "RepositoryError" as const,
  error,
});

type DuplicateError = {
  __tag: "DuplicateError";
  error: "Email already taken" | "Username already taken";
}

type Document = Record<string, unknown> & { _id: ObjectId };

const findOne = <T extends object>(query: T) => (collection: Collection<Document>) =>
  te.tryCatch(
    () => collection.findOne(query),
    repositoryError
  );

export const findById = (id: MongoId) => (
  collection: Collection<Document>
): te.TaskEither<RepositoryError | UserParsingError, o.Option<User>> => {
  return pipe(
    findOne({ _id: id })(collection),
    te.chainW((dbResult) => {
      if (dbResult === null) return te.right(o.none);

      return pipe(
        parseUser(dbResult),
        e.map(o.some),
        te.fromEither
      );
    })
  );
};

export const findByEmail = (email: string) => (
  collection: Collection<Document>
): te.TaskEither<RepositoryError | UserParsingError, o.Option<User>> => {
  return pipe(
    findOne({ email })(collection),
    te.chainW((dbResult) => {
      if (dbResult === null) return te.right(o.none);

      return pipe(
        parseUser(dbResult),
        e.map(o.some),
        te.fromEither
      );
    })
  );
};

const insertTE = (user: User) => (collection: Collection<Document>) =>
  te.tryCatch(
    () => collection.insertOne({ ...user, _id: new ObjectId(user._id) }),
    (error) => {
      // TODO deal with MongoDB duplicate key error
      return repositoryError(error);
    }
  );

export const insert = (user: User) => (
  collection: Collection<Document>
): te.TaskEither<RepositoryError | DuplicateError, User> => {
  return pipe(
    insertTE(user)(collection),
    te.map(() => user)
  )
};
