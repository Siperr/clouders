const signupRouter = require("express").Router();
const passport = require("passport");
const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");

signupRouter.get("/", (req, res) => {
  res.render("signup");
});

signupRouter.post("/", async (req, res) => {
  try {
    console.log(req.body);
    console.log(typeof req.body);

    const { username, password } = req.body;

    console.log("signup post: username - ", username, "password", password);
    const user = await prisma.users.findUnique({
      where: { username },
    });

    if (user) {
      console.log("Signup post error: Username already exists");
      return res
        .status(400)
        .render("error", { message: "Username already exists", back: "/signup" });
    }

    const hashedPw = bcrypt.hashSync(password, 10);

    const createdUser = await prisma.users.create({
      data: {
        username: username,
        password: hashedPw,
      },
    });

    if (createdUser) console.log("sign up post: user created: ", createdUser);

    //creo la cartella principale dello user
    const folder = await prisma.folders.create({
      data: {
        name: createdUser.username,
        owner_id: createdUser.id,
      },
    });

    console.log("sign up post: folder created: ", folder);

    return res.redirect(`/folder/${folder.id}`);
  } catch (err) {
    console.log("Signup post error: " + err);
    return res
      .status(500)
      .render("error", { message: "Error creating user in Sign up", back: "/signup" });
  }
});

module.exports = signupRouter;
