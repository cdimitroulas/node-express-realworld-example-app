import * as apply from "fp-ts/lib/Apply";
import * as e from "fp-ts/lib/Either";
import * as o from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/function";
import { getObjectSemigroup } from "fp-ts/lib/Semigroup";

import {
  array,
  arrayOf,
  unknownObject,
  mongoId,
  string,
  email,
  url,
} from "../types";
import { CreateUserPayload, User, Hash, Salt } from "./user.model";

type UserFieldErrors = { [key in keyof User]?: string };

type NotAnObject = { __tag: "NotAnObject" };

type InvalidFields = { __tag: "InvalidFields"; errors: UserFieldErrors };

export type UserParsingError = NotAnObject | InvalidFields;

const objValidation = e.getValidation(getObjectSemigroup<UserFieldErrors>());

const parseId = (input: unknown) =>
  pipe(
    mongoId(input),
    e.fromOption(() => ({ _id: "Not a valid ID" }))
  );

const parseString = (fieldName: string) => (input: unknown) =>
  pipe(
    string(input),
    e.fromOption(() => ({ [fieldName]: "Not a string" }))
  );

const parseUsername = parseString("username");
const parseBio = parseString("bio");

const parseHash = (input: unknown) =>
  pipe(
    parseString("hash")(input),
    // TODO think of a better way so we can avoid this?
    e.map((x) => x as Hash)
  );

const parseSalt = (input: unknown) =>
  pipe(
    parseString("salt")(input),
    // TODO think of a better way so we can avoid this?
    e.map((x) => x as Salt)
  );

const parseEmail = (input: unknown) =>
  pipe(
    email(input),
    e.fromOption(() => ({ email: "Not a valid email" }))
  );

const parseImage = (input: unknown) =>
  pipe(
    url(input),
    e.fromOption(() => ({ image: "Not a valid URL" }))
  );

const parseArrayOfIds = (fieldName: keyof UserFieldErrors) => (
  input: unknown
) =>
  pipe(
    array(input),
    o.chain(arrayOf(mongoId)),
    e.fromOption(() => ({ [fieldName]: "Not an array of valid IDs" }))
  );

const parseFavorites = parseArrayOfIds("favorites");
const parseFollowing = parseArrayOfIds("following");

export const parseUser = (input: unknown): e.Either<UserParsingError, User> => {
  return pipe(
    unknownObject(input),
    e.fromOption(() => ({ __tag: "NotAnObject" as const })),
    e.chainW((obj) => {
      const result = apply.sequenceS(objValidation)({
        _id: parseId(obj._id),
        username: parseUsername(obj.username),
        email: parseEmail(obj.email),
        bio: parseBio(obj.bio),
        image: parseImage(obj.image),
        favorites: parseFavorites(obj.favorites),
        following: parseFollowing(obj.following),
        hash: parseHash(obj.hash),
        salt: parseSalt(obj.salt),
      });

      return pipe(
        result,
        e.mapLeft((errors) => ({ __tag: "InvalidFields" as const, errors }))
      );
    })
  );
};

type CreateUserPayloadFieldErrors = {
  [key in keyof CreateUserPayload]?: string;
};

type InvalidCreateUserPayloadFields = {
  __tag: "InvalidCreateUserPayloadFields",
  errors: CreateUserPayloadFieldErrors
}

type CreateUserPayloadParsingError = NotAnObject | InvalidCreateUserPayloadFields;

export const parseCreateUserPayload = (
  input: unknown
): e.Either<CreateUserPayloadParsingError, CreateUserPayload> => {
  return pipe(
    unknownObject(input),
    e.fromOption(() => ({ __tag: "NotAnObject" as const })),
    e.chainW((obj) => {
      const result = apply.sequenceS(objValidation)({
        username: parseUsername(obj.username),
        email: parseEmail(obj.email),
        bio: parseBio(obj.bio),
        image: parseImage(obj.image),
        password: parseString("password")(obj.password),
      });

      return pipe(
        result,
        e.mapLeft((errors) => ({ __tag: "InvalidCreateUserPayloadFields" as const, errors }))
      );
    })
  );
};
