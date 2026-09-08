const prisma = require("../config/prisma");
const verifyAuth = require("../middlewares/auth");
const folderRouter = require("express").Router();

const crypto = require("crypto");
const multer = require("multer");

const uploadDir = require("path").join(__dirname, "../tmp/uploads");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(16, function (err, raw) {
      if (err) return cb(err);
      cb(null, file.originalname + "-" + raw.toString("hex"));
    });
  },
});

const upload = multer({ storage: storage });

async function getPath(folder) {
  let path = "/";

  path = path + folder.name + "/";
  let fld = folder;

  console.log("getPath, path: ", path);

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

  return pathParts.reverse();
}

async function getFolder(owner_id, folder_id = null) {
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

async function showFolder(req, res) {
  try {
    const folder = await getFolder(
      Number(req.user.id),
      req.params.id ? Number(req.params.id) : null,
    );
    const pathParts = await getPathParts(folder);
    // console.log("showFolder, path: ", path);

    console.log(`got folder ${folder.name}: `, folder);
    res.render("folder", {
      folder: folder,
      title: folder.name,
      user: req.user,
      pathParts: pathParts,
    });
  } catch (err) {
    console.log("get folder error ", err);
    res
      .status(400)
      .render("error", { message: "could not open folder", back: "/folder" });
  }
}

folderRouter.get("/", verifyAuth, async (req, res) => {
  const folder = await getFolder(req.user.id);
  res.redirect(`/folder/${folder.id}`);
});

folderRouter.get("/:id", verifyAuth, showFolder);

folderRouter.post("/", verifyAuth, async (req, res) => {
  try {
    const { name, parent_folder } = req.body;

    const newFolder = await prisma.folders.create({
      data: {
        name: name,
        parent_folder_id: parent_folder,
        owner_id: req.user.id,
      },
    });

    console.log(`${req.user.username} created the folder ${newFolder.name}`);
    res.redirect(`/folder/${parent_folder}`);
  } catch (err) {
    console.log("create folder error ", err);
    res.status(400).render("error", { message: "could not create folder" });
  }
});

folderRouter.get("/:id/new-folder", verifyAuth, async (req, res) => {
  res.render("newFolder", {
    folder: (await getFolder(req.user.id, req.params.id)) || null,
  });
});

folderRouter.post("/:id/new-folder", verifyAuth, async (req, res) => {
  let folderName = req.body["folder-name"] || null;
  const parentId = Number(req.params.id);
  const userId = Number(req.user.id);

  console.log("new-folder folder name: ", folderName);

  try {
    // trova le cartelle create di default e assegna il numero giusto al duplicato
    const defaultNamedFolders = await prisma.folders.findMany({
      where: {
        parent_folder_id: parentId,
        owner_id: userId,
        name: {
          startsWith: "New folder",
        },
      },
      orderBy: {
        name: "desc",
      },
      select: {
        name: true,
      },
    });

    console.log('new folder, default folders: ', defaultNamedFolders);

    let newNumber = -1;

    if (defaultNamedFolders.length > 0) {
      const lastDefault = defaultNamedFolders[0].name;
      console.log('lastDefault: ', lastDefault);
      console.log('lastDefault split: ', lastDefault.split(' '));
      newNumber = lastDefault.split(" ").length > 2 ? lastDefault.split(' ')[2] : 0;
    }

    console.log('new number: ', newNumber);

    // console.log("new-folder sortedNumbers: ", sortedNumbers);

    const folder = await prisma.$transaction(async (tx) => {
      const parentFolder = await tx.folders.findFirst({
        where: {
          id: parentId,
          owner_id: userId,
        },
        select: {
          id: true,
        },
      });

      if (!parentFolder) {
        throw new Error("Folder not found or authorized.");
      }

      return tx.folders.create({
        data: {
          name:
            folderName ??
            (newNumber >= 0
              ? `New folder ${Number(newNumber) + 1}`
              : "New folder"),
          owner_id: userId,
          parent_folder_id: parentFolder.id,
        },
      });
    });

    res.redirect(`/folder/${parentId}`);
  } catch (err) {
    console.log("New folder error: ", err);
    res
      .status(400)
      .render("error", { message: err, back: `/folder/${parentId}` });
  }
});

folderRouter.get("/:id/upload", verifyAuth, async (req, res) => {
  try {
    const folderId = Number(req.params.id);
    const folder = await getFolder(req.user.id, folderId);

    if (!folder) {
      return res.status(404).render("error", {
        message: "folder not found",
        back: `/folder/`,
      });
    }
    const path = await getPath(folder);
    const actionString = `/folder/${folderId}/upload`;
    res.render("upload", { path, actionString});
  } catch(err) {
    console.log('upload page error: ', err);
    res.status(500).render("error", { message: err, back: `/folder/${folderId}`});
  }
});

folderRouter.post(
  "/:id/upload",
  verifyAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      const folderId = Number(req.params.id);

      const folder = await prisma.folders.findFirst({
        where: {
          id: folderId,
          owner_id: req.user.id,
        },
      });

      if (!folder) {
        return res.status(404).send("Folder not found");
      }

      const newFile = await prisma.files.create({
        data: {
          name: req.file.originalname,
          size: req.file.size,
          mime_type: req.file.mimetype,
          path: req.file.path,
          owner_id: req.user.id,
          folder_id: folderId,
        },
      });

      res.redirect(`/folder/${folderId}`);
    } catch (err) {
      console.log("error uploading file ", err);
      res.status(500).render("error", { message: "could not upload file" });
    }
  },
);

folderRouter.delete("/:id/delete", verifyAuth, async (req, res) => {
  try {
    const folderId = Number(req.params.id);

    const folder = await prisma.folders.findFirst({
      where: {
        id: folderId,
        owner_id: req.user.id,
      },
    });

    if (!folder) {
      return res.status(404).render("error", {
        message: "folder not found",
        back: `/folder`,
      });
    }

    if (folder.parent_folder_id === null) {
      return res.status(400).render("error", {
        message: "Cannot delete root folder",
      });
    }

    const folderToDelete = await prisma.folders.delete({
      where: {
        id: folder.id,
      },
    });

    console.log(`${req.user.username} deleted the '${folder.name}' folder`);
    res.redirect(200, `/folder/${folder.parent_folder_id}`);
  } catch (err) {
    console.log("delete folder error ", err);
    res.status(500).render("error", { message: "could not delete folder" });
  }
});

module.exports = folderRouter;
