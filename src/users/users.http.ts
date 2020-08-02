import { Router } from "express";
import { Collection } from "mongodb";
import { pipe } from "fp-ts/lib/function";
import * as D from "fp-ts/lib/Date";
import * as e from "fp-ts/lib/Either";
import * as o from "fp-ts/lib/Option";
import * as te from "fp-ts/lib/TaskEither";

import { secret } from "../config";
import { generateMongoId } from "../types";
import { createAuthenticatedHandler } from "../routes/authenticatedHandler";
import * as User from "./user.model";
import * as usersRepository from "./users.repository";
import { parseCreateUserPayload } from "./parsing";

// TODO look into refactoring using Reader for passing around the db collection
export const createUserRoutes = (usersCollection: Collection): Router => {
  const router = Router();
  const toAuthUser = (user: User.User) => User.toAuthDTO(user)({ now: D.create, secret })()

  router.get(
    "/user",
    createAuthenticatedHandler((jwtPayload) => async (_, res) => {
      const userId = jwtPayload.id;

      pipe(
        await usersRepository.findById(userId)(usersCollection)(),
        e.fold((error) => {
          switch (error.__tag) {
            case "RepositoryError":
              console.error(error.error);
              return res.sendStatus(500);
            case "InvalidFields":
            case "NotAnObject":
              console.error(error);
              return res.sendStatus(500);
          }
        }, o.fold(() => res.sendStatus(401), (user) => res.json(toAuthUser(user))))
      );
    })
  );

  router.post("/users", async (req, res) => {
    const createNewUser = pipe(
      parseCreateUserPayload(req.body as unknown),
      e.map((validPayload) =>
        User.createUser(validPayload)({ generateMongoId })()
      ),
      te.fromEither,
      te.chainW((user) => usersRepository.insert(user)(usersCollection))
    );

    pipe(
      await createNewUser(),
      e.fold(
        (error): ReturnType<typeof res.send> => {
          switch (error.__tag) {
            case "RepositoryError":
              console.error(error.error);
              return res.sendStatus(500);
            case "NotAnObject":
              return res.status(400).send("Request body must be an object");
            case "InvalidCreateUserPayloadFields":
              return res.status(400).send({
                message: "Request payload was invalid",
                errors: error.errors,
              });
            case "DuplicateError":
              return res.status(409).send({
                message: error.error,
              });
          }
        },
        (user) => {
          return res.status(200).send({ user: toAuthUser(user) })
        }
      )
    );
  });

  return router;
};
