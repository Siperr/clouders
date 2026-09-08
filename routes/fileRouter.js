const fileRouter = require('express').Router();
const prisma = require('../config/prisma');
const verifyAuth = require('../middlewares/auth');


// TODO: CRUD file e download
fileRouter.get('/:id', verifyAuth, async (req, res) => {
    try{ 
        const file = await prisma.files.findUnique({
            where: {
                id: req.params.id,
                owner_id: req.user.id
            }
        });

        console.log(`${req.user.username} requested file: ${file.name}`);

        res.sendFile(file.path);
    } catch(err) {
        console.log('error viewing file ', err);
        res.status(500).render('error', {message: 'could not view file'});
    }
});

fileRouter.delete("/", verifyAuth, async (req, res) => {
    try {
        const fileId = Number(req.body.file_id);

        // controllo che il file esista e appartenga all'utente
        const file = await prisma.files.findFirst({
            where: {
                id: fileId,
                owner_id: req.user.id,
            },
        });

        if (!file) {
            return res.status(404).json({
                message: "File not found",
            });
        }

        // elimina il record dal database
        await prisma.files.delete({
            where: {
                id: file.id,
            },
        });

        // opzionale: eliminare anche il file fisico
        // fs.unlink(file.path, ...)

        res.status(200).json({
            message: "File deleted",
        });

    } catch (err) {
        console.log("delete file error:", err);

        res.status(500).json({
            message: "Could not delete file",
        });
    }
});

fileRouter.get("/download/:id", verifyAuth, async (req, res) => {
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