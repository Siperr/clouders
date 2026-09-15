const { prisma, Permission } = require("../config/prisma");
const { verifyAuth, checkPermission } = require("../middlewares/auth");
const folderRouter = require("express").Router();
const {
  validateRenameFolder,
  validateShareFolder,
} = require("../middlewares/formValidation");
const { validationResult } = require("express-validator");
const {
  getPath,
  getPathParts,
  getFolder,
  showFolder,
  createFolderTree,
} = require("../lib/folderUtils");

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

folderRouter.get("/all", verifyAuth, async (req, res) => {
  console.log("get all");
  const exclude = req.query.exclude
    ? req.query.exclude.split(",").map(Number)
    : [];
  try {
    const folders = await prisma.folders.findMany({
      where: {
        owner_id: Number(req.user.id),
        id: {
          notIn: exclude,
        },
      },
      select: {
        id: true,
        name: true,
        parent_folder_id: true,
      },
    });

    const tree = createFolderTree(folders);
    console.log(tree);
    res.json(tree);
  } catch (err) {
    console.log("get all folders error ", err);
    res
      .status(400)
      .render("error", { message: "could not fetch folders", back: "/folder" });
  }
});

folderRouter.get("/", verifyAuth, async (req, res) => {
  const folder = await getFolder(req.user.id);
  res.redirect(`/folder/${folder.id}`);
});

folderRouter.get("/:id", verifyAuth, checkPermission, showFolder);

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

    console.log("new folder, default folders: ", defaultNamedFolders);

    let newNumber = -1;

    if (defaultNamedFolders.length > 0) {
      const lastDefault = defaultNamedFolders[0].name;
      console.log("lastDefault: ", lastDefault);
      console.log("lastDefault split: ", lastDefault.split(" "));
      newNumber =
        lastDefault.split(" ").length > 2 ? lastDefault.split(" ")[2] : 0;
    }

    console.log("new number: ", newNumber);

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
    res.render("upload", { path, actionString });
  } catch (err) {
    console.log("upload page error: ", err);
    res
      .status(500)
      .render("error", { message: err, back: `/folder/${folderId}` });
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

folderRouter.post(
  "/:id/rename",
  verifyAuth,
  validateRenameFolder,
  async (req, res) => {
    try {
      const folderId = Number(req.params.id);
      const parentId = Number(req.query.parent_id) || null;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).render("error", {
          message: errors.array()[0].msg,
          back: `/folder/${folderId}/`,
        });
      }
      const newName = req.body["new-name"];
      const folder = await prisma.folders.update({
        where: {
          id: folderId,
          owner_id: req.user.id,
        },
        data: {
          name: newName,
        },
      });

      if (!folder) {
        return res.status(404).render("error", {
          message: "folder not found",
          back: `/folder`,
        });
      }

      console.log(
        `${req.user.username} renamed the folder to '${folder.name}'`,
      );
      res.redirect(`/folder/${parentId}`);
    } catch (err) {
      console.log("rename folder error ", err);
      res.status(500).render("error", { message: "could not rename folder" });
    }
  },
);

folderRouter.post("/:id/move", verifyAuth, async (req, res) => {
  try {
    const folderId = Number(req.params.id);
    const newParentId = Number(req.body["new-parent-folder"]);

    const parentId = await prisma.folders.findUnique({
      where: {
        owner_id: req.user.id,
        id: newParentId,
      },
    });

    if (!parentId) {
      throw new Error("Folder not found or authorized.");
    }

    const movedFolder = await prisma.folders.update({
      where: {
        owner_id: req.user.id,
        id: folderId,
      },
      data: {
        parent_folder_id: newParentId,
      },
    });

    res.redirect(`/folder/${newParentId}`);
  } catch (err) {
    console.log("move folder error: ", err);
    res
      .status(500)
      .render("error", { message: "could not move folder", back: "/folder" });
  }
});

// folderRouter.get(
//   "/:id/shared",
//   verifyAuth,
//   checkPermission,
//   async (req, res, next) => {
//     try {
//       console.log(`req.permission: ${req.permission}`);
//       if(!req.permission) {
//         return res.status(403).render("error", {
//           message: "You are not allowed to view this folder",
//           back: `/folder`,
//         });
//       }

//     } catch (err) {
//       console.log("share folder error: ", err);
//       return res.status(500).render("error", {
//         message: "could not share folder",
//         back: `/folder`,
//       });
//     }

//     next();
//   }, showFolder
// );

folderRouter.post(
  "/:id/share",
  verifyAuth,
  validateShareFolder,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).render("error", {
          message: errors.array()[0].msg,
          back: `/folder/${req.params.id}`,
        });
      }

      const folderId = Number(req.params.id);
      const { username, permission } = req.body;

      // check if the user owns the folder
      const folder = await prisma.folders.findUnique({
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

      // create owner of the folder
      const owner = await prisma.shared_folders.create({
        data: {
          folder_id: folderId,
          user_id: req.user.id,
          permission: Permission.OWNER,
        },
      });

      if (!owner) {
        throw new Error("Could not create owner of the shared folder");
      }

      // find the user to share the folder with
      const userToShareWith = await prisma.users.findUnique({
        where: {
          username: username,
        },
      });

      if (!userToShareWith) {
        return res.status(404).render("error", {
          message: "user not found",
          back: `/folder/${folderId}`,
        });
      }

      // create the shared folder entry
      const sharedFolder = await prisma.shared_folders.create({
        data: {
          folder_id: folderId,
          user_id: userToShareWith.id,
          permission:
            permission.toString().toUpperCase() === "READ"
              ? Permission.READ
              : Permission.WRITE,
        },
      });

      if (!sharedFolder) {
        throw new Error("Could not create shared folder entry");
      }

      res.redirect(`/folder/${folderId.parent_folder_id}`);
    } catch (err) {
      console.log("share folder error: ", err);
      res.render("error", {
        message: "could not share folder",
        back: `/folder/${req.params.id}`,
      });
    }
  },
);

folderRouter.delete("/:id/delete", verifyAuth, checkPermission, async (req, res) => {
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
