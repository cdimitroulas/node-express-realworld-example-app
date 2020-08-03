import crypto from "crypto";
import { pipe } from "fp-ts/lib/function";
import * as D from "fp-ts/lib/Date";
import * as io from "fp-ts/lib/IO";
import * as o from "fp-ts/lib/Option";
import jwt from "jsonwebtoken";

import { JWTPayload } from "../routes/authenticatedHandler";
import { Email, URL, MongoId } from "../types";

export type User = {
  _id: MongoId;
  username: string;
  email: Email;
  bio: o.Option<string>;
  image: o.Option<URL>;
  favorites: MongoId[];
  following: MongoId[];
  hash: Hash;
  salt: Salt;
};

export type Salt = string & { __Salt__: never };

export const salt = (): Salt => crypto.randomBytes(16).toString("hex") as Salt;

export type Hash = string & { __Hash__: never };

export const hash = (input: string, salt: Salt): Hash =>
  crypto.pbkdf2Sync(input, salt, 10000, 512, "sha512").toString("hex") as Hash;

export const hashPassword = (pw: string): { hash: Hash; salt: Salt } => {
  const s = salt();

  return { hash: hash(pw, s), salt: s };
};

export const isValidPassword = (pw: string, user: User): boolean =>
  hash(pw, user.salt) === user.hash;

type JWT = string & { __JWT__: never };

const createJWT = (payload: JWTPayload, secret: string): JWT =>
  jwt.sign(payload, secret) as JWT;

type GenerateJWTDeps = {
  now: typeof D.create;
  secret: string;
}

export const generateJWT = (user: User) => (deps: GenerateJWTDeps): io.IO<JWT> => {
  return pipe(
    deps.now,
    io.map((today) => {
      const expiry = new Date(today);
      expiry.setDate(today.getDate() + 60);
      return expiry;
    }),
    io.map((expiry) =>
      createJWT(
        {
          id: user._id,
          username: user.username,
          // Note: bug found?
          // Original code: parseInt(expiry.getTime() / 1000)
          // Compiler error: argument number is not assignable to parameter of type string
          exp: expiry.getTime() / 1000,
        },
        deps.secret
      )
    )
  );
};

export const favorite = (user: User) => (id: MongoId): User => {
  const updatedFavourites = user.favorites.concat(id);
  return { ...user, favorites: updatedFavourites };
};

export const unfavorite = (user: User) => (id: MongoId): User => {
  const updatedFavourites = user.favorites.filter((fav) => fav !== id);
  return { ...user, favorites: updatedFavourites };
};

export const isFavorite = (user: User) => (id: MongoId): boolean =>
  user.favorites.some((fav) => fav === id);

export const follow = (user: User) => (id: MongoId): User => {
  const updatedFollows = user.following.concat(id);
  return { ...user, following: updatedFollows };
};

export const unfollow = (user: User) => (id: MongoId): User => {
  const updatedFollows = user.following.filter((follow) => follow !== id);
  return { ...user, following: updatedFollows };
};

export const isFollowing = (user: User) => (id: MongoId): boolean =>
  user.following.some((f) => f === id);

type AuthDTO = {
  username: string;
  email: string;
  token: string;
  bio?: string;
  image?: string;
};

export const toAuthDTO = (user: User) => (deps: GenerateJWTDeps): io.IO<AuthDTO> => {
  return pipe(
    generateJWT(user)(deps),
    io.map((token) => ({
      username: user.username,
      email: user.email,
      token,
      bio: o.toUndefined(user.bio),
      image: o.toUndefined(user.image),
    }))
  );
};

type CreateUserDeps = {
  generateMongoId: io.IO<MongoId>;
}

export type CreateUserPayload = {
  user: {
    username: string;
    email: Email;
    password: string
  }
}


export const createUser = (input: CreateUserPayload) => (deps: CreateUserDeps): io.IO<User> => {
  return pipe(
    deps.generateMongoId,
    io.map(mongoId => {
      const hashedPassword = hashPassword(input.user.password)
      return {
        _id: mongoId,
        username: input.user.username,
        email: input.user.email,
        bio: o.none,
        image: o.none,
        favorites: [],
        following: [],
        hash: hashedPassword.hash,
        salt: hashedPassword.salt,
      }
    }),
  )
}

// UserSchema.methods.toProfileJSONFor = function(user){
//   return {
//     username: this.username,
//     bio: this.bio,
//     image: this.image || 'https://static.productionready.io/images/smiley-cyrus.jpg',
//     following: user ? user.isFollowing(this._id) : false
//   };
// };
