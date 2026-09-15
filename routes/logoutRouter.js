const logoutRouter = require("express").Router();

logoutRouter.post("/", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
      return res.status(500).render("error", { message: "Error logging out" });
    }
    res.redirect("/");
  });
});

module.exports = logoutRouter;
