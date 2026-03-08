import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Recall.ai API Proxy Routes
  const RECALL_API_KEY = process.env.RECALL_AI_API_KEY;
  const RECALL_BASE_URL = "https://api.recall.ai/api/v1";

  app.post("/api/recall/bot", async (req, res) => {
    try {
      const { meeting_url, bot_name } = req.body;
      if (!RECALL_API_KEY) {
        return res.status(500).json({ error: "RECALL_AI_API_KEY not configured" });
      }

      const response = await fetch(`${RECALL_BASE_URL}/bot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${RECALL_API_KEY}`,
        },
        body: JSON.stringify({
          meeting_url,
          bot_name: bot_name || "Spiked AI Architect",
          transcription_options: {
            provider: "assemblyai",
          },
        }),
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      console.error("Recall API Error:", error);
      res.status(500).json({ error: "Failed to create Recall bot" });
    }
  });

  app.get("/api/recall/bot/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await fetch(`${RECALL_BASE_URL}/bot/${id}`, {
        headers: {
          Authorization: `Token ${RECALL_API_KEY}`,
        },
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bot status" });
    }
  });

  app.get("/api/recall/bot/:id/transcript", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await fetch(`${RECALL_BASE_URL}/bot/${id}/transcript`, {
        headers: {
          Authorization: `Token ${RECALL_API_KEY}`,
        },
      });
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transcript" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
