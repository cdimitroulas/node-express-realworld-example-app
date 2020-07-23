import { Router } from "express";
import { Collection } from "mongodb";
import { pipe } from "fp-ts/lib/function";
import * as D from "fp-ts/lib/Date";
import * as e from "fp-ts/lib/Either";
import * as o from "fp-ts/lib/Option";

import { secret } from "../config";
import { createAuthenticatedHandler } from "../routes/authenticatedHandler";
import * as User from "./user.model";
import * as usersRepository from "./users.repository";

// TODO look into refactoring using Reader for passing around the db collection
export const createUserRoutes = (usersCollection: Collection): Router => {
  const router = Router();

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
        }, o.fold(() => res.sendStatus(401), (user) => res.json(User.toAuthDTO(user)({ now: D.create, secret }))))
      );
    })
  );

  return router
};
