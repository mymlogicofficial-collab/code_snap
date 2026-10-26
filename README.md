# code_snap
coding agent/guide/guru
Simplistic UI
chat window able to process large chunks of information. drag and drop or maunal upload. copy and paste functions. able to process images.
hands free operation. talk to text text to speech
all available permissions across my PC and web
sandbox
MCP compatable
link to github, docker, local files.
Its an assistant for a digital design firm that is capable of coding, image gen, videos through frame by frame generation, and music gen and assistance. it has access to three models. qwen2.5-code, whisper, and claude or local models.



code_snap/
├── .env.example
├── .env.template
├── .gitignore
├── Dockerfile
├── README.md
├── package.json
├── package-lock.json
├── railway.json
├── config.json
├── main.js
├── server.js
├── index.html
├── index.js
├── agent/
│   ├── core.js
│   ├── engine.js
│   ├── environment.js
│   ├── mcp.js [x] scaffolded MCP registry; needs production tools
│   ├── memory.js
│   ├── plugins.js
│   ├── router.js
│   └── skills/
│       ├── autoskill.js
│       ├── code.js
│       ├── coder.js
│       ├── diagnostics.js
│       ├── execute.js
│       ├── files.js
│       ├── images.js
│       ├── system.js
│       └── voice.js
├── server/
│   ├── api.js
│   ├── api_inserts.js
│   ├── permissions.js [x] runtime permission allowlist scaffold only
│   ├── proxy.js
│   └── router.js
├── ui/
│   ├── app.js
│   ├── debug.html
│   ├── debug.js
│   ├── index.html
│   ├── marketplace.html [x] starter shell only
│   ├── marketplace.js [x] starter shell only
│   └── style.css
├── utils/
│   ├── errors.js
│   ├── github.js
│   ├── githubCommit.js
│   └── logger.js
├── plugins/
│   ├── README.md
│   └── samplePlugin.js [x] demo plugin only
├── scripts/
│   ├── start-all.ps1
│   └── start-all.sh
├── logs/
│   └── error.log
├── node_modules/
│   └── generated dependencies (npm install)
└── .github/
    └── workflows/
        └── (if present in repo)
