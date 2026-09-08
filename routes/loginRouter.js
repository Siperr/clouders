const loginRouter = require("express").Router();
const passport = require("passport");

loginRouter.get("/", (req, res) => {
  const error =
    req.session.messages && req.session.messages.length > 0
      ? req.session.messages.pop()
      : null;

  console.log('Login get errors: ', error);

  res.render("login", {error});
});

loginRouter.post(
  "/",
  (req, res, next) => {
    console.log("login post");
    console.log(req.body);
    next();
  },
  passport.authenticate("local", {
    successRedirect: `/folder`,
    failureRedirect: "/login",
    failureMessage: true,
  }),
);

module.exports = loginRouter;
