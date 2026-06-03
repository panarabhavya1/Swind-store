import express from "express";
import cors from "cors";
import "dotenv/config";

import fs from "node:fs";
import path from "node:path";

import { clerkMiddleware } from "@clerk/express";
import { clerkWebhookHandler } from "./webhooks/clerk";
import { getEnv } from "./lib/env";
import keepAliveCron from "./lib/cron";
import meRouter from "./routes/meRouter";
import productRouter from "./routes/productRouter";
import streamRouter from "./routes/streamRouter";

const env = getEnv()
const app = express();

const rawJson = express.raw({ type: "application/json", limit: "1mb" });

// it's important that you don't parse the webhook event data, it should be in the raw format
app.post("/webhooks/clerk", rawJson, (req, res) => {
  void clerkWebhookHandler(req, res);
});

app.use(express.json()); //allowed to use json in request body
app.use(cors()); //allow cross-origin requests
app.use(clerkMiddleware()); // Use Clerk middleware to handle authentication

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/me", meRouter);
app.use("/api/products", productRouter);
app.use("/api/stream", streamRouter);

const publicDir = path.join(process.cwd(), "public");
if(fs.existsSync(publicDir)){
  app.use(express.static(publicDir)); // Serve static files from the "public" directory

  app.get("/{*any}", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    if (req.path.startsWith("/api") || req.path.startsWith("/webhooks")) {
      next();
      return;
    }

    res.sendFile(path.join(publicDir, "index.html"), (err) => next(err));
  });
} // check req from frontend and serve index.html for any route that doesn't start with /api or /webhooks

app.listen(env.PORT, () => {
  console.log("Listening on port:", env.PORT);
  if (env.NODE_ENV === "production") {
    keepAliveCron.start();
  }
});