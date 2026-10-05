import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = Router();

function tokenFor(user) {
  return jwt.sign(
    { id: String(user.id), email: user.email, name: user.name },
    process.env.JWT_SECRET || "dev_secret_change_me",
    { expiresIn: "7d" }
  );
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({ message: "Name, email and a 6+ character password are required." });
    }
    const normalized = email.toLowerCase().trim();
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [normalized]);
    if (existing.length) return res.status(409).json({ message: "Email is already registered." });

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name,email,password_hash) VALUES (?,?,?)",
      [name.trim(), normalized, passwordHash]
    );
    const user = { id: result.insertId, name: name.trim(), email: normalized };
    res.status(201).json({ token: tokenFor(user), user });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Email is already registered." });
    res.status(500).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const normalized = String(req.body.email || "").toLowerCase().trim();
    const password = String(req.body.password || "");
    const [rows] = await pool.query(
      "SELECT id,name,email,password_hash FROM users WHERE email = ? LIMIT 1",
      [normalized]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const safeUser = { id: user.id, name: user.name, email: user.email };
    res.json({ token: tokenFor(safeUser), user: safeUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
