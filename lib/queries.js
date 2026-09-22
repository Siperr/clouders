const { prisma, Permission } = require("../config/prisma");
const { Prisma } = require("@prisma/client");

// folder queries
async function deleteFolder(user, folderId) {
  try {
    const folder = await prisma.folders.delete({
      where: {
        id: folderId,
        owner_id: user.id,
      },
    });

    return folder;
  } catch (err) {
    console.log("delete folder error: ", err);
    throw new Error("Delete folder error: ", err);
  }
}

// file queries

// users queries

// misc

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

async function getSharedFolderTree(folderId, userId) {
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
            p.id,
            p.parent_folder_id,
            ft.depth + 1
        FROM folders p
        JOIN folder_tree ft
            ON p.id = ft.parent_folder_id
        )

        SELECT
            *
        FROM folder_tree ft
        JOIN folders p
            ON p.id = ft.id
        JOIN shared_folders sf
            ON sf.folder_id = p.id
        WHERE sf.user_id = ${userId}
        ORDER BY ft.depth;
    `);

  return result ?? null;
}

module.exports = {
  getEffectivePermission,
  getSharedFolderTree,
};
