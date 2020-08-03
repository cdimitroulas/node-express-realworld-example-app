import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Collection } from "mongodb";
import { pipe } from "fp-ts/lib/function";
import * as e from "fp-ts/lib/Either";
import * as o from "fp-ts/lib/Option";

import * as User from "./user.model";
import { findByEmail } from "./users.repository";

export const setupLocalAuthStrategy = (findUserByEmail: typeof findByEmail) => (
  collection: Collection<any>
): void => {
  passport.use(
    new LocalStrategy(
      {
        usernameField: "user[email]",
        passwordField: "user[password]",
      },
      async (email, password, done) => {
        pipe(
          await findUserByEmail(email)(collection)(),
          e.fold(
            (error) => {
              done(error);
            },
            (userOption) => {
              pipe(
                userOption,
                o.chain((user) => {
                  if (User.isValidPassword(password, user)) {
                    done(null, user);
                    return o.some(undefined);
                  }
                  console.log("Invalid password")

                  return o.none;
                })
              );
              o.getOrElse(() => {
                done(null, false, { message: "Invalid email or password" });
              });
            }
          )
        );
      }
    )
  );
};
