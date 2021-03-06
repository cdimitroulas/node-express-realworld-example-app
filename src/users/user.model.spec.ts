import { assert } from "chai";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import * as o from 'fp-ts/lib/Option'

import { Email, MongoId, URL } from "../types";
import * as User from "./user.model";

describe("User model", () => {
  describe("favorite", () => {
    it("adds the ID to the users list of favorites", () => {
      const hashOutput = User.hashPassword("password");
      const user: User.User = {
        _id: new ObjectId().toString() as MongoId,
        username: "test123",
        email: "test@test.com" as Email,
        bio: o.some("Hi there"),
        image: o.some("www.imgur.com/123" as URL),
        salt: hashOutput.salt,
        hash: hashOutput.hash,
        favorites: [],
        following: [],
      };

      const idToFavourite = new ObjectId().toString() as MongoId;

      const updatedUser = User.favorite(user)(idToFavourite);

      assert.deepStrictEqual(updatedUser, {
        ...user,
        favorites: [idToFavourite],
      });
    });
  });

  describe("unfavorite", () => {
    it("removes the ID to the users list of favorites", () => {
      const hashOutput = User.hashPassword("password");
      const favoriteId = new ObjectId().toString() as MongoId;
      const user: User.User = {
        _id: new ObjectId().toString() as MongoId,
        username: "test123",
        email: "test@test.com" as Email,
        bio: o.some("Hi there"),
        image: o.some("www.imgur.com/123" as URL),
        salt: hashOutput.salt,
        hash: hashOutput.hash,
        favorites: [favoriteId],
        following: [],
      };

      const updatedUser = User.unfavorite(user)(favoriteId);

      assert.deepStrictEqual(updatedUser, { ...user, favorites: [] });
    });
  });

  describe("generateJWT", () => {
    it("generates a jwt which contains user id, username, expiry date + iat in the payload", () => {
      const hashOutput = User.hashPassword("password");
      const today = new Date();
      const secret = "secret";

      const expiryDate = new Date(today);
      expiryDate.setDate(today.getDate() + 60);
      const expectedExpiry = expiryDate.getTime() / 1000;

      const user: User.User = {
        _id: new ObjectId().toString() as MongoId,
        username: "test123",
        email: "test@test.com" as Email,
        bio: o.some("Hi there"),
        image: o.some("www.imgur.com/123" as URL),
        salt: hashOutput.salt,
        hash: hashOutput.hash,
        favorites: [],
        following: [],
      };

      const jwtIO = User.generateJWT(user)({ now: () => today, secret });

      const jwtPayload = jwt.verify(jwtIO(), secret);

      if (typeof jwtPayload === "string") {
        throw new Error("jwt.verify returned a string instead of an object");
      }

      // jwt's type definitions kind of suck so we use a type assertion to get around it for
      // testing
      const { iat, ...restOfJwtPayload } = jwtPayload as any;

      assert.deepStrictEqual(restOfJwtPayload, {
        id: user._id,
        username: user.username,
        exp: expectedExpiry,
      });
      assert.isNumber(iat);
    });
  });

  describe("isValidPassword", () => {
    it("returns true for a correct password", () => {
      const password = "12345";
      const hashOutput = User.hashPassword(password);

      const user: User.User = {
        _id: new ObjectId().toString() as MongoId,
        username: "test123",
        email: "test@test.com" as Email,
        bio: o.some("Hi there"),
        image: o.some("www.imgur.com/123" as URL),
        salt: hashOutput.salt,
        hash: hashOutput.hash,
        favorites: [],
        following: [],
      };

      assert.strictEqual(User.isValidPassword(password, user), true);
    });

    it("returns false for an incorrect password", () => {
      const password = "12345";
      const hashOutput = User.hashPassword(password);

      const user: User.User = {
        _id: new ObjectId().toString() as MongoId,
        username: "test123",
        email: "test@test.com" as Email,
        bio: o.some("Hi there"),
        image: o.some("www.imgur.com/123" as URL),
        salt: hashOutput.salt,
        hash: hashOutput.hash,
        favorites: [],
        following: [],
      };

      assert.strictEqual(User.isValidPassword("invalid password", user), false);
    });
  });

  describe("create", () => {
    it("returns a user object when given valid data", () => {
      const userId = new ObjectId().toString() as MongoId;
      const generateMongoId = () => userId;

      const createUserPayload = {
        user: {
          username: "test123",
          email: "test@example.com" as Email,
          password: "1234",
        }
      };

      const user = User.createUser(createUserPayload)({ generateMongoId })();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hash, salt, ...userWithoutHashFields } = user

      assert.deepStrictEqual(
        userWithoutHashFields,
        {
          _id: userId,
          username: createUserPayload.user.username,
          email: createUserPayload.user.email,
          bio: o.none,
          image: o.none,
          favorites: [],
          following: [],
        }
      );
    });
  });
});
