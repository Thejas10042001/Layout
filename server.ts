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
  const RECALL_BASE_URL_V1 = "https://api.recall.ai/api/v1";
  const RECALL_BASE_URL_V2 = "https://api.recall.ai/api/v2";

  app.post("/api/recall/bot", async (req, res) => {
    try {
      const { meeting_url, bot_name } = req.body;
      const RECALL_API_KEY = process.env.RECALL_AI_API_KEY;

      if (!RECALL_API_KEY) {
        console.error("Recall Auth Error: RECALL_AI_API_KEY is missing from environment.");
        return res.status(500).json({ error: "RECALL_AI_API_KEY not configured. Please add it to the Secrets panel." });
      }

      // Diagnostic log (safe)
      const sanitizedKey = RECALL_API_KEY.trim().replace(/^["']|["']$/g, '');
      console.log(`Recall API Key Check: Length=${sanitizedKey.length}, StartsWith=${sanitizedKey.substring(0, 4)}, EndsWith=${sanitizedKey.substring(sanitizedKey.length - 4)}`);
      
      const tryRecallAuth = async (baseUrl: string) => {
        const authMethods = [
          { name: 'Token', header: `Token ${sanitizedKey}` },
          { name: 'Bearer', header: `Bearer ${sanitizedKey}` },
          { name: 'None', header: sanitizedKey }
        ];

        for (const method of authMethods) {
          console.log(`Trying Recall Auth: Base=${baseUrl}, Method=${method.name}`);
          const response = await fetch(`${baseUrl}/bot`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              Authorization: method.header,
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
          if (response.ok) return { response, data };
          
          if (response.status !== 401) {
             // If it's not an auth error, don't keep trying other auth methods for this base URL
             return { response, data };
          }
          console.log(`Recall Auth Failed: Base=${baseUrl}, Method=${method.name}, Status=${response.status}`);
        }
        return null;
      };

      let result = await tryRecallAuth(RECALL_BASE_URL_V1);
      
      if (!result || (result.response.status === 401)) {
        console.log("Retrying with Recall v2 API...");
        const v2Result = await tryRecallAuth(RECALL_BASE_URL_V2);
        if (v2Result) result = v2Result;
      }

      if (!result) {
        return res.status(401).json({ error: "Recall authentication failed across all methods and versions." });
      }

      const { response, data } = result;
      if (!response.ok) {
        console.error("Recall API Error Response:", data);
      }
      res.status(response.status).json(data);
    } catch (error) {
      console.error("Recall API Error:", error);
      res.status(500).json({ error: "Failed to create Recall bot" });
    }
  });

  app.get("/api/recall/bot/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const RECALL_API_KEY = process.env.RECALL_AI_API_KEY;
      if (!RECALL_API_KEY) return res.status(500).json({ error: "API Key missing" });
      
      const sanitizedKey = RECALL_API_KEY.trim().replace(/^["']|["']$/g, '');
      
      const tryGet = async (baseUrl: string) => {
        const methods = [`Token ${sanitizedKey}`, `Bearer ${sanitizedKey}`, sanitizedKey];
        for (const auth of methods) {
          const response = await fetch(`${baseUrl}/bot/${id}`, {
            headers: { Authorization: auth },
          });
          const data = await response.json();
          if (response.ok) return { response, data };
          if (response.status !== 401) return { response, data };
        }
        return null;
      };

      let result = await tryGet(RECALL_BASE_URL_V1);
      if (!result || result.response.status === 401) {
        const v2Result = await tryGet(RECALL_BASE_URL_V2);
        if (v2Result) result = v2Result;
      }

      if (!result) return res.status(401).json({ error: "Auth failed" });
      res.status(result.response.status).json(result.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bot status" });
    }
  });

  app.get("/api/recall/bot/:id/transcript", async (req, res) => {
    try {
      const { id } = req.params;
      const RECALL_API_KEY = process.env.RECALL_AI_API_KEY;
      if (!RECALL_API_KEY) return res.status(500).json({ error: "API Key missing" });

      const sanitizedKey = RECALL_API_KEY.trim().replace(/^["']|["']$/g, '');

      const tryGetTranscript = async (baseUrl: string) => {
        const methods = [`Token ${sanitizedKey}`, `Bearer ${sanitizedKey}`, sanitizedKey];
        for (const auth of methods) {
          const response = await fetch(`${baseUrl}/bot/${id}/transcript`, {
            headers: { Authorization: auth },
          });
          const data = await response.json();
          if (response.ok) return { response, data };
          if (response.status !== 401) return { response, data };
        }
        return null;
      };

      let result = await tryGetTranscript(RECALL_BASE_URL_V1);
      if (!result || result.response.status === 401) {
        const v2Result = await tryGetTranscript(RECALL_BASE_URL_V2);
        if (v2Result) result = v2Result;
      }

      if (!result) return res.status(401).json({ error: "Auth failed" });
      res.status(result.response.status).json(result.data);
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
