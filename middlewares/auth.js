const { prisma, Permission } = require("../config/prisma");
const { getEffectivePermission } = require("../lib/queries");

function verifyAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect("/login");
}

async function checkPermission(req, res, next) {
  try {
    if (req.params.id && req.baseUrl.includes("file")) {
      const file = await prisma.files.findUnique({
        where: {
          id: Number(req.params.id),
        },
      });
      req.file = { parent: file.folder_id };
    }

    const folderId = req.file ? Number(req.file.parent) : Number(req.params.id);
    const shared_folder = await getEffectivePermission(
      folderId,
      Number(req.user.id),
    );

    

    const folder = await prisma.folders.findUnique({
      where: {
        id: folderId,
        owner_id: Number(req.user.id),
      },
    });

    const owner = await prisma.folders.findUnique({
      where: {
        id: folderId,
      },
      include: {
        users: true,
      },
    });

    if (!folder && !shared_folder) {
      throw new Error("User does not have permission to access this folder");
    }

    const permission = folder
      ? Permission.OWNER
      : shared_folder
        ? shared_folder
        : null;

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
