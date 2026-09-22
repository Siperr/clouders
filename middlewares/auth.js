const { prisma, Permission } = require("../config/prisma");
const { Prisma } = require("@prisma/client");

function verifyAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect("/login");
}

async function getEffectivePermission(folderId, userId) {
  const result =
    await prisma.$queryRaw(Prisma.sql`WITH RECURSIVE folder_tree AS (

        SELECT
          id,
          parent_folder_id,
          0 AS depth
        FROM folders
        WHERE id = ${folderId}

        UNION ALL

        SELECT
          f.id,
          f.parent_folder_id,
          ft.depth + 1
        FROM folders f
        JOIN folder_tree ft
          ON f.id = ft.parent_folder_id
      )

      SELECT sf.permission
      FROM folder_tree ft
      JOIN shared_folders sf
        ON sf.folder_id = ft.id
      WHERE sf.user_id = ${userId}
      ORDER BY ft.depth
      LIMIT 1;
    `);

  return result[0]?.permission ?? null;
}

async function checkPermission(req, res, next) {
  try {
    if(req.params.id && req.baseUrl.includes("file")) {
      const file = await prisma.files.findUnique({
        where: {
          id: Number(req.params.id),
        },
      });
      req.file = {parent: file.folder_id};
    }

    const folderId = req.file ? Number(req.file.parent) : Number(req.params.id);
    const shared_folder = await getEffectivePermission(folderId, Number(req.user.id));

    console.log(
      "checkPermission, req.id: ",
      req.params.id,
      ", req.user.id: ",
      req.user.id,
      ", shared_folder: ",
      shared_folder
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

    if(!folder && !shared_folder) {
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
