const express = require("express");
const cors = require("cors");
const path = require("path");
const cfg = require("./config");
const connectDB = require("./config/db");
const routes = require("./routes");

const app = express();

app.use(cors({ origin: cfg.FRONTEND_URL }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => res.json({ status: "ok", service: "sahajpath-node" }));

// All API + media routes live under /api (matches AUDIO_PUBLIC_PATH usage).
app.use("/api", routes);

// Built-in test console — open http://localhost:5000/ to exercise every endpoint.
app.use("/", express.static(path.join(__dirname, "../public")));

connectDB();
app.listen(cfg.NODE_PORT, () =>
  console.log(`🚀 SahajPath gateway on ${cfg.NODE_BASE_URL} (AI: ${cfg.PYTHON_AI_URL})`)
);
