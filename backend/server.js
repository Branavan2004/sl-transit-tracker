// Boots the Express API server, mounts feature routes, and exposes Swagger docs.
const express = require("express");
const cors = require("cors");
const path = require("path");
const YAML = require("yamljs");
const swaggerUi = require("swagger-ui-express");

const routeRouter = require("./routes");
const busRouter = require("./routes/buses");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const swaggerDocument = YAML.load(path.join(__dirname, "swagger.yaml"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/routes", routeRouter);
app.use("/buses", busRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Resource not found." });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
