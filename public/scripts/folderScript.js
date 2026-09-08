// import queries from "../../lib/queries.js";

function addFile() {
  const currFolder = window.location.pathname.split("/")[2] || "";
  window.location.href = `/folder/${currFolder}/upload`;
}

function addFolder() {
  const currFolder = window.location.pathname.split("/")[2] || "";
  window.location.href = `/folder/${currFolder}/new-folder`;
}

function showFolderMenu(idString) {
  const id = Number(idString);
  const folderMenu = document.querySelector(
    `.folder#folder-${id} .folder-menu`,
  );
  const folderMenuBtn = document.querySelector(
    `.folder#folder-${id} .folder-menu-btn`,
  );

  folderMenu.hidden = !folderMenu.hidden;

  if (folderMenu.hidden) return;

  const rect = folderMenuBtn.getBoundingClientRect();
  folderMenu.style.position = "fixed";
  folderMenu.style.left = `${rect.left - folderMenu.offsetWidth + 180}px`;
  folderMenu.style.top = `${rect.bottom - 50}px`;
}

function closeFolderMenu(idString) {
  const id = Number(idString);
  const folderMenu = document.querySelector(
    `.folder#folder-${id} .folder-menu`,
  );
  folderMenu.hidden = true;
}

function deleteFolder(user, folderId) {
  const fid = Number(folderId);

  try {
    const folder = queries.deleteFolder(user, fid);

    if (folder) location.reload();
  } catch (err) {
    console.log(err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("add-btn");
  const menu = document.getElementById("add-menu");
  const menuOffset = 200;

  addBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // opzionale, vedi sotto

    menu.hidden = !menu.hidden;

    if (menu.hidden) return;

    const rect = addBtn.getBoundingClientRect();

    menu.style.position = "fixed";
    menu.style.left = `${rect.left - menu.offsetWidth - 10}px`;
    menu.style.top = `${rect.bottom - menuOffset}px`;
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !addBtn.contains(e.target)) {
      menu.hidden = true;
    }
  });
});
