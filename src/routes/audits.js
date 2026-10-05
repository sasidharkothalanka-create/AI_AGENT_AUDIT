import { Router } from "express";
import { pool } from "../db.js";
import { auth } from "../middleware/auth.js";
import { buildAuditFindings, calculateScore } from "../services/auditEngine.js";

const router = Router();
router.use(auth);

async function getAudit(auditId, userId) {
  const [rows] = await pool.query(
    `SELECT id AS _id, user_id AS userId, agent_id AS agentId, agent_name AS agentName,
            status, progress, score, started_at AS startedAt, completed_at AS completedAt
       FROM audits WHERE id = ? AND user_id = ? LIMIT 1`,
    [auditId, userId]
  );
  if (!rows[0]) return null;
  const [findings] = await pool.query(
    `SELECT category,title,severity,status,detail
       FROM audit_findings WHERE audit_id = ? ORDER BY id ASC`,
    [auditId]
  );
  return { ...rows[0], findings };
}

export function registerAuditSocket(io) {
  return async (auditId, userId, agent) => {
    const findings = buildAuditFindings(agent);

    for (const progress of [10, 25, 45, 65, 82, 100]) {
      await new Promise(resolve => setTimeout(resolve, 500));

      const status = progress === 100 ? "completed" : "running";
      await pool.query(
        "UPDATE audits SET progress = ?, status = ? WHERE id = ? AND user_id = ?",
        [progress, status, auditId, userId]
      );

      io.to(`user:${userId}`).emit("audit:progress", { auditId: String(auditId), progress, status });
    }

    const score = calculateScore(findings);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        "UPDATE audits SET progress=100,status='completed',score=?,completed_at=NOW() WHERE id=? AND user_id=?",
        [score, auditId, userId]
      );
      await connection.query("DELETE FROM audit_findings WHERE audit_id=?", [auditId]);
      for (const f of findings) {
        await connection.query(
          "INSERT INTO audit_findings (audit_id,category,title,severity,status,detail) VALUES (?,?,?,?,?,?)",
          [auditId, f.category, f.title, f.severity, f.status, f.detail]
        );
      }
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    const completed = await getAudit(auditId, userId);
    io.to(`user:${userId}`).emit("audit:completed", completed);
  };
}

router.get("/", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id AS _id, user_id AS userId, agent_id AS agentId, agent_name AS agentName,
            status, progress, score, started_at AS startedAt, completed_at AS completedAt
       FROM audits WHERE user_id = ? ORDER BY started_at DESC`,
    [req.userId]
  );
  for (const row of rows) {
    const [findings] = await pool.query(
      "SELECT category,title,severity,status,detail FROM audit_findings WHERE audit_id=? ORDER BY id ASC",
      [row._id]
    );
    row.findings = findings;
  }
  res.json(rows);
});

router.get("/:id", async (req, res) => {
  const audit = await getAudit(req.params.id, req.userId);
  if (!audit) return res.status(404).json({ message: "Audit not found." });
  res.json(audit);
});

router.post("/", async (req, res) => {
  const { agentId } = req.body;
  const [agents] = await pool.query(
    "SELECT id AS _id, name, endpoint, type, status FROM agents WHERE id=? AND user_id=? LIMIT 1",
    [agentId, req.userId]
  );
  const agent = agents[0];
  if (!agent) return res.status(404).json({ message: "Agent not found." });

  const [result] = await pool.query(
    "INSERT INTO audits (user_id,agent_id,agent_name,status,progress) VALUES (?,?,?,'queued',0)",
    [req.userId, agent._id, agent.name]
  );

  const audit = await getAudit(result.insertId, req.userId);
  res.status(201).json(audit);

  req.app.get("startAudit")(result.insertId, req.userId, agent);
});

export default router;
