const loginRouter = require("express").Router();
const passport = require("passport");

loginRouter.get("/", (req, res) => {
  const error =
    req.session.messages && req.session.messages.length > 0
      ? req.session.messages.pop()
      : null;

  res.render("login", {error});
});

loginRouter.post(
  "/",
  passport.authenticate("local", {
    successRedirect: `/folder`,
    failureRedirect: "/login",
    failureMessage: true,
  }),
);

module.exports = loginRouter;
