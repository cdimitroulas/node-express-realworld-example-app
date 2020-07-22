import crypto from "crypto";
import { pipe } from "fp-ts/lib/function";
import * as D from "fp-ts/lib/Date";
import * as io from "fp-ts/lib/IO";
import jwt from "jsonwebtoken";

import { Email, URL, MongoId } from "../types";

export type User = {
  _id: MongoId;
  username: string;
  email: Email;
  bio: string;
  image: URL;
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

const createJWT = <T extends object>(payload: T, secret: string): JWT =>
  jwt.sign(payload, secret) as JWT;

export const generateJWT = (user: User) => (deps: {
  now: typeof D.create;
  secret: string;
}): io.IO<JWT> => {
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
  const updatedFavourites = user.favorites.concat(id)
  return { ...user, favorites: updatedFavourites }
}

export const unfavorite = (user: User) => (id: MongoId): User => {
  const updatedFavourites = user.favorites.filter(fav => fav !== id)
  return { ...user, favorites: updatedFavourites }
}

export const isFavorite = (user: User) => (id: MongoId): boolean =>
  user.favorites.some(fav => fav === id)

export const follow = (user: User) => (id: MongoId): User => {
  const updatedFollows = user.following.concat(id)
  return { ...user, following: updatedFollows }
}

export const unfollow = (user: User) => (id: MongoId): User => {
  const updatedFollows = user.following.filter(follow => follow !== id)
  return { ...user, following: updatedFollows }
}

export const isFollowing = (user: User) => (id: MongoId): boolean =>
  user.following.some(f => f === id)

// var UserSchema = new mongoose.Schema({
//   username: {type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true},
//   email: {type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/\S+@\S+\.\S+/, 'is invalid'], index: true},
//   bio: String,
//   image: String,
//   favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
//   following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
//   hash: String,
//   salt: String
// }, {timestamps: true});

// UserSchema.methods.toAuthJSON = function(){
//   return {
//     username: this.username,
//     email: this.email,
//     token: this.generateJWT(),
//     bio: this.bio,
//     image: this.image
//   };
// };

// UserSchema.methods.toProfileJSONFor = function(user){
//   return {
//     username: this.username,
//     bio: this.bio,
//     image: this.image || 'https://static.productionready.io/images/smiley-cyrus.jpg',
//     following: user ? user.isFollowing(this._id) : false
//   };
// };
