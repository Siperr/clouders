
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS folders CASCADE;
DROP TABLE IF EXISTS shared_folders CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE folders (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_folder_id INTEGER,
    owner_id INTEGER NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE TABLE shared_folders (
    folder_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,

    PRIMARY KEY (folder_id, user_id),
    FOREIGN KEY (folder_id) REFERENCES folders(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    path TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    folder_id INTEGER NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    sid TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL,
    expires_at TIMESTAMP(3) NOT NULL,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
);