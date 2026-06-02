import express from "express";
import cors from "cors";
import "dotenv/config";

import { clerkMiddleware } from "@clerk/express";
import { clerkWebhookHandler } from "./webhooks/clerk";
import { getEnv } from "./lib/env";

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


app.listen(env.PORT,()=> console.log(`Server is running on port ${env.PORT}`));