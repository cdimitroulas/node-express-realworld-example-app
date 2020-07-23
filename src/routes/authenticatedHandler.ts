import { RequestHandler, Request } from "express";
import * as jwt from "jsonwebtoken";
import * as apply from "fp-ts/lib/Apply";
import * as e from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

import { MongoId, mongoId, string, number, unknownObject } from "../types";

const secret =
  process.env.NODE_ENV === "production" ? process.env.SECRET : "secret";

if (!secret) {
  throw new Error("SECRET env variable was not set");
}

export type JWTPayload = {
  id: MongoId;
  username: string;
  exp: number;
};

type JWTParsingError = {
  __tag: "JWTParsingError";
  error: string;
};

const getTokenFromHeader = (req: Request) => {
  if (
    (req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Token") ||
    (req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer")
  ) {
    return req.headers.authorization.split(" ")[1];
  }

  return null;
};

// Note: This is something which is missing in the original JS code - there was an assumption
// that the jwt payload would be an object of the right shape when decoded. This parsing
// removes that assumption and checks that this is true before going on
const parseToJWTPayload = (
  input: string | object
): e.Either<JWTParsingError, JWTPayload> => {
  if (typeof input === "string") {
    return e.left({
      __tag: "JWTParsingError" as const,
      error: "JWT payload was not an object",
    });
  }

  return pipe(
    unknownObject(input),
    e.fromOption(() => ({
      __tag: "JWTParsingError" as const,
      error: "JWT payload was not an object",
    })),
    e.chainW((obj) => {
      const id = pipe(
        mongoId(obj.id),
        e.fromOption(() => "JWT payload id property was not a valid Mongo ID")
      );

      const username = pipe(
        string(obj.username),
        e.fromOption(() => "JWT payload username property was not a string")
      );

      const exp = pipe(
        number(obj.exp),
        e.fromOption(() => "JWT payload exp property was not a number")
      );

      return pipe(
        apply.sequenceS(e.either)({ id, username, exp }),
        e.mapLeft((error) => ({ __tag: "JWTParsingError" as const, error }))
      );
    })
  );
};

const verifyJWT = (token: string) =>
  parseToJWTPayload(jwt.verify(token, secret));

type CreateAuthenticatedHandler = (
  handler: (jwtPayload: JWTPayload) => RequestHandler
) => RequestHandler;

export const createAuthenticatedHandler: CreateAuthenticatedHandler = (
  handler
) => {
  return (req, res, next) => {
    const token = getTokenFromHeader(req);

    if (!token) {
      res.sendStatus(401);
      return;
    }

    pipe(
      verifyJWT(token),
      e.map(handler),
      e.map(partiallyAppliedHandler => partiallyAppliedHandler(req, res, next))
    )
  };
};
