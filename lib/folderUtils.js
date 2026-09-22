const { prisma, Permission } = require("../config/prisma");
const { getSharedFolderTree } = require("./queries");

async function getPath(folder) {
  let path = "/";

  path = path + folder.name + "/";
  let fld = folder;

  //   console.log("getPath, path: ", path);

  try {
    while (
      fld.parent_folder_id !== null &&
      (fld = await prisma.folders.findFirst({
        where: {
          id: fld.parent_folder_id,
        },
      }))
    ) {
      path = path + fld.name + "/";
    }
  } catch (err) {
    console.log("buildPath error: ", err);
  }

  return path.split("/").reverse().join(">").slice(1);
}

async function getPathPartsShared(folder, userId) {
  let pathParts = [];

  try {
    const sharedFolderTree = await getSharedFolderTree(folder.id, userId);

    sharedFolderTree.forEach((f) => {
      pathParts.push({ id: f.id, name: f.name });
    });

    pathParts.push({ id: 'shared-with-you', name: "[Shared with you]" });

    
  } catch (err) {
    console.log("getPathPartsShared error: ", err);
    throw new Error("getPathPartsShared error: ", err);
  }

  return pathParts.slice().reverse();
}

async function getPathParts(folder) {
  let pathParts = [];

  pathParts.push({ id: folder.id, name: folder.name });

  try {
    while (
      folder.parent_folder_id !== null &&
      (folder = await prisma.folders.findFirst({
        where: {
          id: folder.parent_folder_id,
        },
      }))
    ) {
      pathParts.push({ id: folder.id, name: folder.name });
    }

  } catch (err) {
    console.log("getPathParts error: ", err);
  }

  return pathParts.slice().reverse();
}

async function getFolder(owner_id, folder_id = null, shared = false) {
  if (shared) {
    return await prisma.folders.findFirst({
      where: {
        id: Number(folder_id),
      },
      include: {
        files: true,
        other_folders: true,
      },
    });
  }

  const where = {
    owner_id: Number(owner_id),
  };

  if (folder_id) {
    where.id = Number(folder_id);
  } else {
    where.parent_folder_id = null;
  }

  return await prisma.folders.findFirst({
    where,
    include: {
      files: true,
      other_folders: true,
    },
  });
}

async function getSharedFolders(user_id) {
  return await prisma.shared_folders.findMany({
    where: {
      user_id: Number(user_id),
      permission: {
        not: Permission.OWNER,
      },
    },
    include: {
      folders: true,
    },
  });
}

async function showFolder(req, res) {
  try {
    const isShared =
      req.permission !== null &&
      req.permission !== undefined &&
      req.permission !== Permission.OWNER;

    const folder = await getFolder(
      Number(req.user.id),
      req.params.id ? Number(req.params.id) : null,
      isShared,
    );

    const folders = await prisma.folders.findMany({
      where: {
        owner_id: Number(req.user.id),
      },
    });

    if (!folders || !folder) {
      return res.status(404).render("error", {
        message: "Unable to load folders",
        back: "/folder",
      });
    }

    const sharedFolders = await prisma.shared_folders.findMany({
      where: {
        user_id: Number(req.user.id),
      },
    });

    if (sharedFolders) {
      folder.other_folders = folder.other_folders.map((f) => {
        if (sharedFolders.find((sf) => sf.folder_id === f.id)) {
          return { ...f, shared: true };
        }

        return f;
      });
    }

    if (req.permission && req.sharedBy && req.permission !== Permission.OWNER) {
      return res.render("folder", {
        folder: folder,
        title: folder.name,
        user: req.user,
        pathParts: await getPathPartsShared(folder, Number(req.user.id)),
        sharedInfo: {
          permission: req.permission,
          sharedBy: req.sharedBy,
        },
        folderTree: createFolderTree(folders),
        sharedFolders: (await getSharedFolders(req.user.id)) || [],
      });
    }

    let sharedWith = await prisma.shared_folders.findMany({
      where: {
        folder_id: Number(req.params.id),
        user_id: {
          not: Number(req.user.id),
        },
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    sharedWith = sharedWith.map((sf) => ({
      id: sf.users.id,
      username: sf.users.username,
      permission: sf.permission,
    }));

    console.log("showFolder, sharedWith: ", sharedWith);

    const pathParts = await getPathParts(
      folder,
      req.permission !== null && req.permission !== undefined,
    );

    res.render("folder", {
      folder: folder,
      title: folder.name,
      user: req.user,
      pathParts: pathParts,
      sharedInfo: {
        permission: req.permission,
        sharedBy: req.sharedBy,
      },
      sharedWith: sharedWith,
      folderTree: createFolderTree(folders),
      sharedFolders: (await getSharedFolders(req.user.id)) || [],
    });
  } catch (err) {
    console.log("get folder error ", err);
    res
      .status(400)
      .render("error", { message: "could not open folder", back: "/folder" });
  }
}

async function showAllSharedFolders(req, res) {
  try {
    const sharedFolders = await prisma.shared_folders.findMany({
      where: {
        user_id: req.user.id,
        folders: {
          owner_id: {
            not: req.user.id,
          },
        },
      },
      include: {
        folders: true,
      },
    });

    const allFolders = await prisma.folders.findMany({
      where: {
        owner_id: req.user.id,
      },
      select: {
        id: true,
        name: true,
        parent_folder_id: true,
      },
    });

    if (!sharedFolders || sharedFolders.length === 0) {
      return res.render("folder", {
        folder: { other_folders: [] },
        title: "Shared with you",
        user: req.user,
        pathParts: [{ id: null, name: "[Shared with you]" }],
        folderTree: createFolderTree(allFolders),
        sharedFolders: (await getSharedFolders(req.user.id)) || [],
      });
    }

    return res.render("folder", {
      folder: {
        other_folders: sharedFolders.map((sf) => {
          return { ...sf.folders, isShared: true };
        }),
      },
      title: "Shared with you",
      user: req.user,
      pathParts: [{ id: null, name: "[Shared with you]" }],
      folderTree: createFolderTree(allFolders),
      sharedFolders: (await getSharedFolders(req.user.id)) || [],
    });
  } catch (err) {
    console.log("Error fetching shared folders: ", err);
    res.status(500).render("error", {
      message: "Could not fetch shared folders",
      back: `/folder`,
    });
  }
}

function createFolderTree(folders) {
  const nodes = new Map();

  folders.forEach((folder) => {
    nodes.set(folder.id, { id: folder.id, name: folder.name, children: [] });
  });

  let root = null;

  folders.forEach((folder) => {
    const node = nodes.get(folder.id);

    if (folder.parent_folder_id === null) {
      root = node;
    } else {
      const parentNode = nodes.get(folder.parent_folder_id);

      if (parentNode) {
        parentNode.children.push(node);
      }
    }
  });

  return root;
}

module.exports = {
  getPath,
  getPathParts,
  getFolder,
  showFolder,
  createFolderTree,
  showAllSharedFolders,
};
