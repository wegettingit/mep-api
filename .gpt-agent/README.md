
# GPT Agent Instructions: MEP Backend (Node.js / Express / MongoDB)

## 🧠 Project: Mise En Place AI (MEP) – Backend Overview

This is the backend for the MEP (Mise En Place) app — an AI-powered pre-service kitchen tool designed to help cooks mentally prepare before service by organizing recipes, cleaning tasks, whiteboard prep, and more.

## 🛠️ Tech Stack
- Node.js
- Express
- MongoDB (with Mongoose models)
- JWT for authentication
- Render for deployment
- GitHub for version control

## 📁 Folder Structure
```
middleware/
  └── auth.js          # Auth middleware (JWT, role check)
models/
  ├── AccessRequest.js # Pending user access requests
  ├── CleaningTask.js  # Cleaning task schema
  ├── Recipe.js        # Recipes schema (title, description, station)
  ├── User.js          # User login, password hash, role (admin/user), station
  └── Whiteboard.js    # Whiteboard notes schema (today/tomorrow prep)
.env                  # JWT_SECRET and MongoDB URI
server.js             # Express app entry point
```

## ✅ Features Currently Implemented
- 🔐 Secure login with JWT
- 🧑‍🍳 User registration with role & station
- 🍽 Recipe add/view/delete (admin only)
- 🧽 Cleaning tasks (add/view/delete)
- 🧠 Whiteboard: Today’s/Tomorrow’s prep
- 🔐 Access request system with approval logic
- Middleware: `authenticateToken` and `requireAdmin`

## 🐞 Known Bugs / Fixes Needed
- [ ] DELETE route for `/recipes/:id` returns 403 even when logged in as admin (token/role not verified correctly)
- [ ] Station sometimes returns undefined in localStorage despite login being successful
- [ ] Access key on register needs cleanup/clarity (maybe replace with admin-only invite flow)

## 🧠 You (GPT Agent) Should:
- Refactor `server.js` for clarity/modularity
- Fix the admin check bug on DELETE routes
- Validate all models have correct defaults, timestamps
- Add error handling to all route responses
- Propose schema improvements if any inefficiencies exist
- 🧠 Add Smart Prep Routine Learning

This new feature allows MEP to suggest common prep items for a given day based on past saves, simulating a sous chef’s memory.

## 🤖 What the Human Will Handle:
- Testing in Render, Notion table updates
- User experience flow and UI/UX design
- Strategic decisions about features + roadmap

## 🚨 Deadline
Prepare all backend features for live test and demo by:
**Thursday, July 25th, 2025 @ Startup Weekend OKC**
