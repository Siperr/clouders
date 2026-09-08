const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const prisma = require("./prisma");
const bcrypt = require("bcrypt");

passport.use(
  new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password",
    },
    async (username, password, done) => {
      try {
        const user = await prisma.users.findUnique({
          where: { username },
        });

        console.log("passport strategy: username", username);
        console.log("passport strategy: password", password);

        if (!user) {
          console.log("passport strategy: Incorrect username.");
          return done(null, false, { message: "Incorrect username." });
        }

        console.log("password to compare: ", password);
        console.log("saved password hash: ", user.password);

        if (!bcrypt.compareSync(password, user.password)) {
          console.log("passport strategy: Incorrect password.");
          return done(null, false, { message: "Incorrect password." });
        }

        return done(null, user);
      } catch (err) {
        console.log('passport authentication failed: ',err);
        return done(err);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.users.findUnique({
      where: {
        id,
      },
    });

    done(null, user);
  } catch (error) {
    done(error);
  }
});
