const { upload } = require("../config/multer");
const crypto = require("crypto");
const supabase = require("../config/supabase");
const path = require("path");

async function uploadFileToSupabase(req, res, next) {
  const ext = path.extname(req.file.originalname);
  const random = crypto.randomBytes(16).toString("hex");
  const filename = `${random}${ext}`;
  const storagePath = `users/${req.user.id}/${filename}`;

  const { data, error } = await supabase.storage
    .from("files")
    .upload(storagePath, req.file.buffer, {
      contentType: req.file.mimetype,
    });

  if (error) {
    console.error("Error uploading file to Supabase:", result.error);
    throw new Error("Error uploading file to Supabase");
  }

  req.file.supabasePath = data.path;
  next();
}

async function downloadFileFromSupabase(filePath) {
  const { data, error } = await supabase.storage
    .from("files")
    .download(filePath);
  if (error) {
    console.error("Error downloading file from Supabase:", error);
    throw new Error("Error downloading file from Supabase");
  }

  return data;
}

async function deleteFileFromSupabase(filePath) {
  const { data, error } = await supabase.storage
    .from("files")
    .remove([filePath]);

  if (error) {
    console.error("Error deleting file from Supabase:", error);
    throw new Error("Error deleting file from Supabase");
  }

  return data;
}

async function getSignedUrlFromSupabase(filePath) {
  const { data, error } = await supabase.storage
    .from("files")
    .createSignedUrl(filePath, 60);

  if (error) {
    console.error("Error creating signed URL from Supabase:", error);
    throw new Error("Error creating signed URL from Supabase");
  }

  return data.signedUrl;
}

async function getSignedUrlDownloadFromSupabase(filePath) {
  const { data, error } = await supabase.storage
    .from("files")
    .createSignedUrl(filePath, 
        300,
        { download: true }
    );

  if (error) {
    console.error("Error creating signed URL from Supabase:", error);
    throw new Error("Error creating signed URL from Supabase");
  }

    return data.signedUrl;
}

module.exports = {
  uploadFileToSupabase,
  deleteFileFromSupabase,
  downloadFileFromSupabase,
  getSignedUrlFromSupabase,
  getSignedUrlDownloadFromSupabase,
};
