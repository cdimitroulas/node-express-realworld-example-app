import { assert } from "chai";
import * as e from "fp-ts/lib/Either";
import { ObjectId } from "mongodb";

import { parseUser, parseCreateUserPayload } from "./parsing";

describe("user parsing", () => {
  describe("parseUser", () => {
    it("succeeds when given a valid user", () => {
      const favId = new ObjectId().toString();
      const followId = new ObjectId().toString();

      const user: unknown = {
        _id: new ObjectId().toString(),
        username: "tester123",
        email: "test@test.com",
        bio: "Hello there",
        image: "https://www.imgur.com/images/1",
        favorites: [favId],
        following: [followId],
        hash: "fhaefuaiofh",
        salt: "123456fefuih",
      };

      assert.deepStrictEqual(parseUser(user), e.right(user));
    });

    it("fails when given an input which isn't an object", () => {
      const user: unknown = null;

      assert.deepStrictEqual(parseUser(user), e.left({ __tag: "NotAnObject" }));
    });

    it("returns all the field errors when the data is invalid", () => {
      const user: unknown = {};

      assert.deepStrictEqual(
        parseUser(user),
        e.left({
          __tag: "InvalidFields" as const,
          errors: {
            _id: "Not a valid ID",
            username: "Not a string",
            email: "Not a valid email",
            bio: "Not a string",
            image: "Not a valid URL",
            favorites: "Not an array of valid IDs",
            following: "Not an array of valid IDs",
            hash: "Not a string",
            salt: "Not a string",
          },
        })
      );
    });
  });

  describe("parseCreateUserPayload", () => {
    it("fails when payload is invalid", () => {
      const payload: unknown = {};

      const result = parseCreateUserPayload(payload);

      assert.deepStrictEqual(
        result,
        e.left({
          __tag: "InvalidCreateUserPayloadFields" as const,
          errors: {
            username: "Not a string",
            email: "Not a valid email",
            password: "Not a string",
            bio: "Not a string",
            image: "Not a valid URL",
          },
        })
      );
    });

    it("succeeds when payload is invalid", () => {
      const payload: unknown = {
        username: "test123",
        email: "test@example.com",
        password: "1234",
        bio: "Hello everyone",
        image: "www.imgur.com/images/1",
      };

      const result = parseCreateUserPayload(payload);

      assert.deepStrictEqual(result, e.right(payload));
    });
  });
});
