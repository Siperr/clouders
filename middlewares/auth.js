const { prisma, Permission } = require("../config/prisma");

function verifyAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect("/login");
}

async function checkPermission(req, res, next) {
  try {

    // folder is a shared folder?
    const shared_folder = await prisma.shared_folders.findUnique({
      where: {
        folder_id_user_id: {
          folder_id: Number(req.params.id),
          user_id: Number(req.user.id),
        },
      },
    });

    // folder is contained in a shared folder?

    

    // folder is owned by the user

    const folder = await prisma.folders.findUnique({
      where: {
        id: Number(req.params.id),
        owner_id: Number(req.user.id)
      }
    });


    const owner = await prisma.folders.findUnique({
      where: {
        id: Number(req.params.id),
      },
      include: {
        users: true,
      },
    });

    const permission = shared_folder ? shared_folder.permission : folder ? Permission.OWNER : null;

    req.permission = permission;
    req.sharedBy = owner.users.username ? owner.users.username : null;

    next();
  } catch (err) {
    console.log("checkPermission error: ", err);
    return res.status(500).render("error", {
      message: "could not validate share folder",
      back: `/folder`,
    });
  }
}

module.exports = {
  verifyAuth,
  checkPermission,
};
