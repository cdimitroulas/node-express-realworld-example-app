// var mongoose = require('mongoose');
// var uniqueValidator = require('mongoose-unique-validator');
import crypto from "crypto";
import { pipe } from "fp-ts/lib/function";
import * as D from "fp-ts/lib/Date";
import * as io from "fp-ts/lib/IO";
import * as o from "fp-ts/lib/Option";
import jwt from "jsonwebtoken";
import validator from "validator";
import { ObjectId } from "mongodb";
// var secret = require('../config').secret;

import { string } from "../types";

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

export type Salt = string & { __Salt__: never };

export const salt = (): Salt => crypto.randomBytes(16).toString("hex") as Salt;

export type Hash = string & { __Hash__: never };

export const hash = (input: string, salt: Salt) =>
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

// UserSchema.methods.generateJWT = function() {
//   var today = new Date();
//   var exp = new Date(today);
//   exp.setDate(today.getDate() + 60);

//   return jwt.sign({
//     id: this._id,
//     username: this.username,
//     exp: parseInt(exp.getTime() / 1000),
//   }, secret);
// };

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

// UserSchema.methods.favorite = function(id){
//   if(this.favorites.indexOf(id) === -1){
//     this.favorites.push(id);
//   }

//   return this.save();
// };

// UserSchema.methods.unfavorite = function(id){
//   this.favorites.remove(id);
//   return this.save();
// };

// UserSchema.methods.isFavorite = function(id){
//   return this.favorites.some(function(favoriteId){
//     return favoriteId.toString() === id.toString();
//   });
// };

// UserSchema.methods.follow = function(id){
//   if(this.following.indexOf(id) === -1){
//     this.following.push(id);
//   }

//   return this.save();
// };

// UserSchema.methods.unfollow = function(id){
//   this.following.remove(id);
//   return this.save();
// };

// UserSchema.methods.isFollowing = function(id){
//   return this.following.some(function(followId){
//     return followId.toString() === id.toString();
//   });
// };

// mongoose.model('User', UserSchema);
