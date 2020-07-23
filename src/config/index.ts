if (process.env.NODE_ENV === "production" && !process.env.SECRET) {
  throw new Error("SECRET env variable was not set");
}

const secret = process.env.SECRET || "secret";

export { secret }
