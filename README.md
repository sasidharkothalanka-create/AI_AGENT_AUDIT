# AI Agent Audit — Full Stack (MySQL)

React + Node.js + Express + **MySQL** + Socket.IO.

## Stack

- React + Vite
- Bootstrap 5
- Node.js + Express
- MySQL / MySQL Community Server
- mysql2
- JWT + bcryptjs
- Socket.IO

## Requirements

- Node.js 18+
- MySQL 8+ (XAMPP, MySQL Installer, or another local MySQL installation)

## 1. Create the database

Open MySQL Workbench or the MySQL command line and run:

```sql
SOURCE /path/to/server/schema.sql;
```

Or copy/paste the contents of `server/schema.sql`.

It creates:

- `ai_agent_audit`
- `users`
- `agents`
- `audits`
- `audit_findings`

## 2. Configure MySQL

Copy:

```text
server/.env.example
```

to:

```text
server/.env
```

Then set your MySQL details:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=ai_agent_audit
JWT_SECRET=use_a_long_random_secret
CLIENT_URL=http://localhost:5173
```

If your MySQL root account has no password, leave `DB_PASSWORD=` empty.

## 3. Install

From the project root:

```bash
npm install
npm run install:all
```

## 4. Start

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

## 5. Test

1. Create an account.
2. Sign in.
3. Add an AI agent.
4. Start an audit.
5. Watch live Socket.IO progress.
6. Open Reports.
7. Confirm the data exists in MySQL.

## Free setup

MySQL Community Server is free to use locally. For deployment, choose a hosting provider that offers a MySQL-compatible free tier; free-tier availability and limits can change.

## Important

The included audit engine performs deterministic application checks for demonstration and development. It is not a complete security scanner and does not guarantee a real-world security score. Only audit systems you own or are authorized to assess.
