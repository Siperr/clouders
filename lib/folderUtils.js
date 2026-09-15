const { prisma, Permission } = require("../config/prisma");

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
      console.log("getPath, path: ", path);
    }
  } catch (err) {
    console.log("buildPath error: ", err);
  }

  const reversePath = path.split("/").reverse().join(">").slice(1);
  console.log("getPath, final path: ", reversePath);

  return reversePath;
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
  let folder = null;

   console.log("getFolder: owner_id: ", owner_id, "folder_id: ", folder_id, "shared: ", shared);

  if (shared) {
    folder = await prisma.folders.findFirst({
      where: {
        id: Number(folder_id),
      },
      include: {
        files: true,
        other_folders: true,
      },
    });
  } else {
    const where = {
      owner_id: Number(owner_id),
    };

    if (folder_id) {
      where.id = Number(folder_id);
    } else {
      where.parent_folder_id = null;
    }

    folder = await prisma.folders.findFirst({
      where,
      include: {
        files: true,
        other_folders: true,
      },
    });
  }

  return folder;
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
    const folder = await getFolder(
      Number(req.user.id),
      req.params.id ? Number(req.params.id) : null,
      req.permission !== null && req.permission !== undefined && req.permission !== Permission.OWNER,
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

    // cartella condivisa
    console.log(
      "req.permission: ",
      req.permission,
      "req.sharedBy: ",
      req.sharedBy,
    );
    if (req.permission && req.sharedBy && req.permission !== Permission.OWNER) {
      return res.render("folder", {
        folder: folder,
        title: folder.name,
        user: req.user,
        pathParts: [],
        sharedInfo: {
          permission: req.permission,
          sharedBy: req.sharedBy,
        },
        folderTree: createFolderTree(folders),
        sharedFolders: (await getSharedFolders(req.user.id)) || [],
      });
    }

    const pathParts = await getPathParts(
      folder,
      req.permission !== null && req.permission !== undefined,
    );

    res.render("folder", {
      folder: folder,
      title: folder.name,
      user: req.user,
      pathParts: pathParts,
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
};
