const express = require("express");

const app = express();
const appVersion = process.env.APP_VERSION || "1.0.0";
const environment = process.env.APP_ENV || "local";

app.use(express.json());

app.get("/", (req, res) => {
  // Root endpoint to check if the app is running
  res.json({
    message: "Jenkins CI/CD demo app is running",
    environment,
    version: appVersion,
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    environment,
    version: appVersion,
    timestamp: new Date().toISOString(),
  });
});

app.post("/echo", (req, res) => {
  res.status(200).json({
    received: req.body || {},
  });
});

module.exports = app;
