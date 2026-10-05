import { Router } from "express";
import { pool } from "../db.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);

router.get("/", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id AS _id, name, endpoint, type, status, created_at AS createdAt FROM agents WHERE user_id = ? ORDER BY created_at DESC",
    [req.userId]
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { name, endpoint, type = "AI Agent" } = req.body;
  if (!name || !endpoint) return res.status(400).json({ message: "Name and endpoint are required." });

  const [result] = await pool.query(
    "INSERT INTO agents (user_id,name,endpoint,type,status) VALUES (?,?,?,?,?)",
    [req.userId, name.trim(), endpoint.trim(), type, "Ready"]
  );
  const [rows] = await pool.query(
    "SELECT id AS _id, name, endpoint, type, status, created_at AS createdAt FROM agents WHERE id = ?",
    [result.insertId]
  );
  res.status(201).json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  const [result] = await pool.query(
    "DELETE FROM agents WHERE id = ? AND user_id = ?",
    [req.params.id, req.userId]
  );
  if (!result.affectedRows) return res.status(404).json({ message: "Agent not found." });
  res.json({ ok: true });
});

export default router;
