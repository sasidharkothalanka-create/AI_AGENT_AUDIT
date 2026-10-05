import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { connectDatabase } from "./db.js";
import authRoutes from "./routes/auth.js";
import agentRoutes from "./routes/agents.js";
import auditRoutes, { registerAuditSocket } from "./routes/audits.js";

const app = express();
const server = http.createServer(app);
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({ origin: clientUrl }));
app.use(express.json({ limit: "1mb" }));

const io = new Server(server, { cors: { origin: clientUrl } });

io.on("connection", socket => {
  socket.on("join:user", userId => {
    if (userId) socket.join(`user:${userId}`);
  });
});

app.set("startAudit", registerAuditSocket(io));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, database: "mysql", service: "AI Agent Audit API", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/audits", auditRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error." });
});

const port = Number(process.env.PORT || 5000);

connectDatabase()
  .then(() => {
    server.listen(port, () => console.log(`MySQL API running on http://localhost:${port}`));
  })
  .catch(error => {
    console.error("MySQL connection failed:", error.message);
    console.error("Check server/.env and make sure MySQL is running.");
    process.exit(1);
  });
