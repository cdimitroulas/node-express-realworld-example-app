import express from "express";
import bodyParser from "body-parser";
import session from "express-session";

import { createRoutes } from './routes'
import {MongoClient} from "mongodb";

const main = async (): Promise<void> => {
  const app = express();

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  app.use(express.static(__dirname + "/public"));

  app.use(
    session({
      secret: "conduit",
      cookie: { maxAge: 60000 },
      resave: false,
      saveUninitialized: false,
    })
  );

  const db = await MongoClient
    .connect(process.env.MONGODB_URI || 'mongodb://localhost/conduit')
    .then(client => client.db('conduit'))

  app.use(createRoutes(db))

  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`Listening on port ${port}`)
  })
};

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
