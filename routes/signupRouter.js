const signupRouter = require("express").Router();
const passport = require("passport");
const { prisma } = require("../config/prisma");
const bcrypt = require("bcrypt");
const { validateSignupForm } = require("../middlewares/formValidation");
const { validationResult } = require("express-validator");

signupRouter.get("/", (req, res) => {
  res.render("signup");
});

signupRouter.post("/", validateSignupForm, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render("signup", { error: errors.array()[0].msg});
    }

    const { username, password } = req.body;

    const user = await prisma.users.findUnique({
      where: { username },
    });

    if (user) {
      return res
        .status(400)
        .render("signup", { error: "Username already exists" });
    }

    const hashedPw = bcrypt.hashSync(password, 10);

    const createdUser = await prisma.users.create({
      data: {
        username: username,
        password: hashedPw,
      },
    });

    const folder = await prisma.folders.create({
      data: {
        name: createdUser.username,
        owner_id: createdUser.id,
      },
    });

    return res.redirect(`/folder/${folder.id}`);
  } catch (err) {
    console.log("Signup post error: " + err);
    return res
      .status(500)
      .render("error", { message: "Error creating user in Sign up", back: "/signup" });
  }
});

module.exports = signupRouter;
