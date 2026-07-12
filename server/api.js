import express from "express";
import fileUpload from "express-fileupload";

export async function startServer({ router }) {
  const app = express();
  app.use(express.json());
  app.use(fileUpload());

  app.post("/chat", async (req, res) => {
    const result = await router.handle({
      type: "text",
      text: req.body.text
    });
    res.json(result);
  });

  app.post("/upload", async (req, res) => {
    const file = req.files.file;
    const result = await router.handle({
      type: "file",
      file
    });
    res.json(result);
  });

  app.post("/image", async (req, res) => {
    const file = req.files.image;
    const result = await router.handle({
      type: "image",
      file
    });
    res.json(result);
  });

  app.post("/voice", async (req, res) => {
    const audio = req.files.audio;
    const result = await router.handle({
      type: "voice",
      audio
    });
    res.json(result);
  });

  app.post("/autoskill", async (req, res) => {
    const { skillName, description } = req.body;
    const result = await router.handle({
      type: "autoskill",
      skillName,
      description
    });
    res.json(result);
  });

  app.listen(3000);
}
