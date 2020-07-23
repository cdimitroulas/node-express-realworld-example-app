import { Router } from 'express'
import { Db } from 'mongodb'

import { createUserRoutes } from './users'

export const createRoutes = (db: Db): Router => {
  const router = Router()

  router.use('/api', createUserRoutes(db.collection('users')))

  return router
}
