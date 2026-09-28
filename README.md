# ☁️ Clouders

A lightweight Google Drive-inspired file management platform built with **Express**, **EJS**, **Prisma**, and **PostgreSQL**.

![Dashboard](/public/assets/folder.png)

Clouders allows authenticated users to upload, organize, preview, share and manage files through a server-rendered interface with permission-based access control. Uploaded files are stored in **Supabase Storage**, enabling persistent cloud storage and supporting files up to **100 MB**.

> This project was built as a full-stack exercise to explore authentication, authorization, file management, relational database modeling, and MVC application architecture.


## 🚀 Live Demo

https://clouders-uset.onrender.com

> [!NOTE]
>The application is deployed on Render's free tier. > If the service has been idle, the first request may > take around a minute while the server wakes up.

### Demo Account

username: `faffi`

Password: `faffi`

---

## Features

- 🔐 User authentication with Passport Local Strategy
- 👤 Secure password hashing using bcrypt
- 💾 Persistent user sessions
- 📁 Create and organize folders
- 🧭 File explorer-like navigation with interactive breadcrumbs
- 🌳 Collapsible folder tree sidebar for quick navigation
- 📤 Upload files up to 100 MB
- ☁️ Persistent object storage powered by Supabase Storage
- 👀 In-browser preview for supported file types
- 📥 File download support
- 🤝 Share folders with other users
- 🔑 Permission-based access control
  - Read permissions
  - Write permissions
  - Permission inheritance from parent folders
- ✅ Server-side form validation
- 🎨 Server-side rendering with EJS templates

---

## Tech Stack

### Backend

* Node.js
* Express.js
* Prisma ORM
* PostgreSQL
* Supabase Storage

### Frontend

* EJS
* HTML
* CSS
* Vanilla JavaScript

### Authentication

* Passport.js
* Express Session
* bcrypt

### File Handling

* Multer


---

## Access Control

>[!NOTE]
>Folder ownership, permissions, and inheritance are enforced entirely on the server, preventing unauthorized access even when requests are manually crafted.

Clouders implements a permission-based authorization system for shared folders.

Users can share folders with other registered users and assign different access levels:

- **Read**: allows users to view folder contents and preview or download files
- **Write**: allows users to modify folder contents

Permissions are inherited through the folder hierarchy, allowing access rules to be applied consistently across nested folders.

All permissions are validated server-side before performing protected operations.

---

## Architecture

```text
                Client
                   │
             Express + EJS
                   │
      ┌────────────┴────────────┐
      │                         │
   Prisma ORM          Supabase Storage
      │                         │
 PostgreSQL             Uploaded Files
```

---

## Project Structure

```text
.
├── config/          # Prisma and Passport configuration
├── lib/             # Database queries and folder utilities
├── middlewares/     # Authentication and validation middleware
├── prisma/          # Prisma schema
├── public/          # Static assets
├── routes/          # Application routes
├── views/           # EJS templates
└── tmp/uploads/     # Uploaded files
```

The application follows a modular architecture where routing, authentication, database access, validation, and business logic are separated into dedicated modules.

---

## File Preview

Clouders provides an integrated preview page for files supported by modern browsers.

Currently supported preview types include:

- 📝 Plain text
- 🖼 Images
- 🎵 Audio
- 🎬 Video
- 📄 PDF documents

Unsupported file types can still be downloaded normally.

---

## Screenshots

### Login

![Login](/public/assets/login.png)


### Upload

![Upload](/public/assets/upload.png)

### Folder

![Folder](/public/assets/folder.png)

### Preview
![Preview](/public/assets/preview.png)

---

## Future Improvements

- Improve upload experience with drag & drop support
- Add a notification system for managing shared folder invitations
- Introduce expiring public sharing links
- Implement automated testing with unit and integration tests

---

## What I Learned

Building Clouders helped me improve my understanding of:

* Designing and structuring a full-stack Express application
* Implementing authentication and authorization flows with Passport.js
* Managing persistent sessions and secure user authentication
* Modeling relational data with Prisma ORM and PostgreSQL
* Designing permission-based access control systems
* Implementing folder hierarchies and permission inheritance
* Handling file uploads and server-side file management with Multer
* Building reusable Express middleware for authentication and validation
* Structuring server-side rendered applications with EJS
* Separating routing, business logic, database operations, and utilities into maintainable modules
* Integrating cloud object storage with Supabase Storage
* Separating file metadata from binary file storage

