const prisma = require("../config/prisma");

// folder queries
async function deleteFolder(user, folderId) {
    try {
        const folder = await prisma.folders.delete({
            where: {
                id: folderId,
                owner_id: user.id
            }
        });

        return folder;

    } catch(err) {
        console.log('delete folder error: ', err);
        throw new Error('Delete folder error: ', err);
    }
}

// file queries

// users queries


module.exports = {
    deleteFolder
}