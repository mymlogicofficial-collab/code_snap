import express from "express";
import axios from "axios";
import fs from "fs";
import { logError, logInfo } from "../utils/logger.js";

const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
const target = config?.engine?.localURL || "http://localhost:11434/api/generate";
const listenPort = Number(process.env.PROXY_PORT) || 3001;

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Forward POST /api/generate to the Ollama localURL
app.post("/api/generate", async (req, res) => {
  try {
    const axiosRes = await axios.post(target, req.body, {
      headers: { ...req.headers, host: new URL(target).host },
      responseType: "stream",
      timeout: 300000
    });

    res.status(axiosRes.status);
    for (const [k, v] of Object.entries(axiosRes.headers || {})) {
      if (["transfer-encoding", "content-encoding"].includes(k.toLowerCase())) continue;
      res.setHeader(k, v);
    }

    axiosRes.data.pipe(res);
  } catch (err) {
    logError("Proxy", err?.message || String(err));
    const status = err?.response?.status || 502;
    res.status(status).json({ error: "Proxy to Ollama failed", details: err?.message });
  }
});

app.listen(listenPort, () => {
  logInfo("Proxy", `Proxy listening on port ${listenPort}, forwarding to ${target}`);
});

export default app;
