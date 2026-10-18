  // Proxy endpoint to forward to local model (Ollama)
  app.post("/proxy/generate", async (req, res) => {
    try {
      const config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
      const target = config?.engine?.localURL || "http://localhost:11434/api/generate";

      const axiosRes = await axios.post(target, req.body, {
        headers: { ...req.headers, host: new URL(target).host },
        responseType: "stream",
        timeout: 120000
      });

      res.status(axiosRes.status);
      for (const [k, v] of Object.entries(axiosRes.headers || {})) {
        if (["transfer-encoding", "content-encoding"].includes(k.toLowerCase())) continue;
        res.setHeader(k, v);
      }

      axiosRes.data.pipe(res);
    } catch (err) {
      logError("API.proxy", err?.message || String(err));
      const status = err?.response?.status || 502;
      res.status(status).json({ error: "Proxy to Ollama failed", details: err?.message });
    }
  });

  // Generic invoke endpoint for router-based skills (coder, diagnostics, etc.)
  app.post("/invoke", async (req, res) => {
    try {
      // Expect body to be the skill input object, e.g. { type: 'coder', ... }
      const payload = req.body || {};
      const result = await router.handle(payload);
      res.json(result);
    } catch (err) {
      logError("API.invoke", err?.message || String(err));
      res.status(500).json({ error: "invoke_failed", details: err?.message });
    }
  });

  app.get("/logs", (req, res) => {
    try {
      const text = fs.readFileSync("logs/error.log", "utf8");
      res.type("text/plain").send(text);
    } catch (err) {
      logError("API.logs", err?.message || String(err));
      res.type("text/plain").send("No logs available.");
    }
  });
