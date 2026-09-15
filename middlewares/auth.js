const { prisma } = require("../config/prisma");

function verifyAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect("/login");
}

async function checkPermission(req, res, next) {
  try {
    const shared_folder = await prisma.shared_folders.findUnique({
      where: {
        folder_id_user_id: {
          folder_id: Number(req.params.id),
          user_id: Number(req.user.id),
        },
      },
    });

    const owner = await prisma.folders.findUnique({
      where: {
        id: Number(req.params.id),
      },
      include: {
        users: true,
      }
    });

    console.log("checkPermission: owner: ", owner);

    const permission = shared_folder ? shared_folder.permission : null;

    req.permission = permission;
    req.sharedBy = owner.users.username ? owner.users.username : null;
  } catch (err) {
    console.log("validate share folder error: ", err);
    return res
      .status(500)
      .render("error", {
        message: "could not validate share folder",
        back: `/folder`,
      });
  }

  next();
}

module.exports = {
  verifyAuth,
  checkPermission,
};
