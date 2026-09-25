const fileRouter = require("express").Router();
const { prisma, Permission } = require("../config/prisma");
const { verifyAuth, checkPermission } = require("../middlewares/auth");
const fs = require("fs");
const { validateRenameFile } = require("../middlewares/formValidation");
const { validationResult } = require("express-validator");
const path = require("path");

fileRouter.get("/:id", verifyAuth, checkPermission, async (req, res) => {
  if(!req.permission) {
    return res.status(403).render("error", {
      message: "You do not have permission to view this file",
      back: `/folder/${req.query.parent_id}`,
    });
  }
  
  try {
    const file = await prisma.files.findUnique({
      where: {
        id: Number(req.params.id),
      },
    });

    res.sendFile(
      path.join(__dirname, "../tmp/uploads", file.path),
      {
        headers: {
          "Content-Disposition": "inline",
          "Content-Type": file.mime_type,
        },
      },
      (err) => {
        if (err) {
          console.error("Error sending file:", err);
        } else {
          console.log("Sent:", file.name);
        }
      },
    );
  } catch (err) {
    console.log("error viewing file ", err);
    res.status(500).render("error", {
      message: "could not view file",
      back: `/folder/${file.folder_id}`,
    });
  }
});

fileRouter.delete(
  "/:id/delete",
  verifyAuth,
  checkPermission,
  async (req, res) => {
    if(req.permission !== Permission.OWNER) {
      return res.status(403).render("error", {
        message: "You do not have permission to delete this file",
        back: `/folder/${req.query.parent_id}`,
      });
    }

    try {
      const fileId = Number(req.params.id);

      const file = await prisma.files.findFirst({
        where: {
          id: fileId,
          owner_id: req.user.id,
        },
      });

      if (!file) {
        return res.status(404).render("error", {
          message: "file not found",
          back: `/folder`,
        });
      }
      
      fs.unlink(path.join(__dirname, "../tmp/uploads", file.path), (err) => {
        if (err) {
          console.error("Error deleting file from filesystem:", err);
          throw new Error("Error deleting file from filesystem:" + err);
        }
      });

      const deletedFile = await prisma.files.delete({
        where: {
          id: file.id,
        },
      });
      

      res.redirect(200, `/folder/${file.folder_id}`);
    } catch (err) {
      console.log("delete file error:", err);

      res.status(500).json({
        message: "Could not delete file",
      });
    }
  },
);

fileRouter.get(
  "/:id/download/",
  verifyAuth,
  checkPermission,
  async (req, res) => {
    if(!req.permission) {
      return res.status(403).render("error", {
        message: "You do not have permission to download this file",
        back: `/folder/${req.query.parent_id}`,
      });
    }

    try {
      const fileId = Number(req.params.id);

      const file = await prisma.files.findFirst({
        where: {
          id: fileId,
        },
      });

      if (!file) {
        return res.status(404).send("File not found");
      }

      res.download(path.join(__dirname, "../tmp/uploads", file.path), file.name);
    } catch (err) {
      console.log("download file error:", err);

      res.status(500).render("error", {
        message: "Could not download file",
      });
    }
  },
);

fileRouter.post(
  "/:id/rename",
  verifyAuth,
  checkPermission,
  validateRenameFile,
  async (req, res) => {
    if (req.permission === Permission.READ) {
      return res.status(403).render("error", {
        message: "You do not have permission to rename this file",
        back: `/folder/${req.query.parent_id}`,
      });
    }

    try {
      const fileId = Number(req.params.id);
      const newName = req.body["new-file-name"];
      const parentId = req.query["parent_id"]
        ? Number(req.query["parent_id"])
        : "";

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).render("error", {
          message: errors.array()[0].msg,
          back: `/folder/${parentId}/`,
        });
      }

      const file = await prisma.files.update({
        where: {
          id: fileId,
        },
        data: {
          name: newName,
        },
      });

      if (!file) {
        return res.status(404).render("error", {
          message: "file not found",
          back: `/folder/${parentId}`,
        });
      }

      res.redirect(`/folder/${parentId}`);
    } catch (err) {
      console.log("rename file error:", err);
      res.status(500).render("error", { message: "could not rename file" });
    }
  },
);

fileRouter.post("/:id/move", verifyAuth, checkPermission, async (req, res) => {
  if (req.permission !== Permission.OWNER) {
    return res.status(403).render("error", {
      message: "You do not have permission to move this file",
      back: `/folder/${req.query.parent_id}`,
    });
  }

  try {
    const fileId = Number(req.params.id);
    const newFolderId = Number(req.body["new-parent-folder"]);

    const file = await prisma.files.update({
      where: {
        id: fileId,
        owner_id: req.user.id,
      },
      data: {
        folder_id: newFolderId,
      },
    });

    if (!file) {
      return res.status(404).render("error", {
        message: "Destination folder not found",
        back: `/folder/${fileId}/`,
      });
    }

    res.redirect(`/folder/${newFolderId}`);
  } catch (err) {
    console.log("move file error:", err);
    res.status(500).render("error", {
      message: err,
      back: `/folder/${Number(req.body["new-folder-id"])}`,
    });
  }
});

module.exports = fileRouter;
