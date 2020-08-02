import { assert } from "chai";
import * as e from "fp-ts/lib/Either";
import * as o from "fp-ts/lib/Option";
import { ObjectId, Collection } from "mongodb";

import * as usersRepository from "./users.repository";
import { MongoId } from "../types";

describe("usersRepository", () => {
  describe("findById", () => {
    it("when successful returns a user object", async () => {
      const userId = new ObjectId().toString() as MongoId;

      const userDocument = {
        _id: new ObjectId(),
        username: "test123",
        email: "test@test.com",
        bio: "Hello there",
        image: "https://www.imgur.com/images/1",
        favorites: [new ObjectId()],
        following: [new ObjectId()],
        hash: "iauwdhaiduh",
        salt: "hiaudhaiduahdiauhda",
      };

      const usersCollection = ({
        findOne: async () => userDocument,
      } as unknown) as Collection;

      const result = await usersRepository.findById(userId)(usersCollection)();

      assert.deepStrictEqual(
        result,
        e.right(
          o.some({
            ...userDocument,
            _id: userDocument._id.toString(),
            bio: o.some(userDocument.bio),
            image: o.some(userDocument.image),
            favorites: userDocument.favorites.map((id) => id.toString()),
            following: userDocument.following.map((id) => id.toString()),
          })
        )
      );
    });

    it("returns a RepositoryError when the MongoDB query fails", async () => {
      const userId = new ObjectId().toString() as MongoId;
      const error = new Error("DB error");

      const usersCollection = ({
        findOne: async () => {
          throw error;
        },
      } as unknown) as Collection;

      const result = await usersRepository.findById(userId)(usersCollection)();

      assert.deepStrictEqual(
        result,
        e.left({ __tag: "RepositoryError" as const, error })
      );
    });

    it("returns a ParsingError when MongoDB returns an invalid document", async () => {
      const userId = new ObjectId().toString() as MongoId;
      const error = new Error("DB error");

      const usersCollection = ({
        findOne: async () => {
          // user is missing the username field
          return {
            _id: new ObjectId(userId),
            email: "test@test.com",
            bio: "Hello there",
            image: "https://www.imgur.com/images/1",
            favorites: [new ObjectId()],
            following: [new ObjectId()],
            hash: "iauwdhaiduh",
            salt: "hiaudhaiduahdiauhda",
          };
        },
      } as unknown) as Collection;

      const result = await usersRepository.findById(userId)(usersCollection)();

      assert.deepStrictEqual(
        result,
        e.left({
          __tag: "InvalidFields" as const,
          errors: { username: "Not a string" },
        })
      );
    });
  });
});
