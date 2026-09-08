const fileRouter = require("express").Router();
const prisma = require("../config/prisma");
const verifyAuth = require("../middlewares/auth");
const fs = require("fs");

// TODO: CRUD file e download
fileRouter.get("/:id", verifyAuth, async (req, res) => {
  try {
    const file = await prisma.files.findUnique({
      where: {
        id: Number(req.params.id),
        owner_id: req.user.id,
      },
    });

    console.log(`${req.user.username} requested file: ${file.name}`);
    console.log("file path: ", file.path);
    console.log("file mime_type: ", file.mime_type);

    res.sendFile(
      file.path,
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
    res.status(500).render("error", { message: "could not view file", back: `/folder/${file.folder_id}` });
  }
});

fileRouter.delete("/:id/delete", verifyAuth, async (req, res) => {
  try {
    const fileId = Number(req.params.id);

    // controllo che il file esista e appartenga all'utente
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

    // elimina il record dal database
    await prisma.files.delete({
      where: {
        id: file.id,
      },
    });

    fs.unlink(file.path, (err) => {
      if (err) {
        console.error("Error deleting file from filesystem:", err);
      }
    });

    console.log(`${req.user.username} deleted the '${file.name}' file`);
    res.redirect(200, `/folder/${file.folder_id}`); 
  } catch (err) {
    console.log("delete file error:", err);

    res.status(500).json({
      message: "Could not delete file",
    });
  }
});

fileRouter.get("/:id/download/", verifyAuth, async (req, res) => {
  try {
    const fileId = Number(req.params.id);

    const file = await prisma.files.findFirst({
      where: {
        id: fileId,
        owner_id: req.user.id,
      },
    });

    if (!file) {
      return res.status(404).send("File not found");
    }

    res.download(file.path, file.name);
  } catch (err) {
    console.log("download file error:", err);

    res.status(500).render("error", {
      message: "Could not download file",
    });
  }
});

module.exports = fileRouter;
