// this file is responsible for handling clerk webhooks, if  upadated or created a user in clerk, we want to update or create the user in our database as well, so we can use the role and other information in our application
// change in clerk user should reflect in our database, and if the user is deleted in clerk, we should delete the user from our database as well
import type { Request, Response } from "express";
import { getEnv } from "../lib/env";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { parseRole } from "../lib/roles";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";


export async function clerkWebhookHandler(req: Request, res: Response){
    const env = getEnv();

    try{
        // Check if the webhook secret is configured and secret is important for security, it ensures that the request is coming from Clerk and not from an unauthorized source
        if(!env.CLERK_WEBHOOK_SECRET){
            res.status(503).json({error: "Clerk webhook secret is not configured"});
            return;
        }

         // Clerk's verifier expects a Web Request with the raw body; Express may give Buffer or string.
         const payload = req.body instanceof Buffer ? req.body.toString("utf8") : String(req.body);
        // Verify the webhook signature using Clerk's SDK

        const request = new Request("http://internal/webhooks/clerk", {
          method: "POST",
          headers: new Headers(req.headers as HeadersInit),
          body: payload,
        }); // verify webhook signature and parse the event, if the signature is invalid or the payload was tampered with, this will throw an error and we will return a 400 response, otherwise we can trust the event data and process it accordingly

        // throws if signature is wrong or body was tampered with; only then we trust evt.
        const evt = await verifyWebhook(request, { signingSecret: env.CLERK_WEBHOOK_SECRET });

        if(evt.type === "user.created" || evt.type === "user.updated"){
            const u = evt.data;

            const email =
                u.email_addresses?.find((e) => e.id === u.primary_email_address_id)?.email_address ??
                u.email_addresses?.[0]?.email_address;
            
            // username 
            const displayName =
                [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || null;
            
            // role like admin or customer or supporter
            const role = parseRole(u.public_metadata?.role);

            await db
                .insert(users)
                .values({
                    clerkUserId: u.id,
                    email,
                    displayName,
                    role,
                })
                .onConflictDoUpdate({ // if the user already exists, update the email, displayName and role
                    target: users.clerkUserId,
                    set: { email, displayName, role, updatedAt: new Date() },
                });
            
        }
        if (evt.type === "user.deleted") {
            const id = evt.data.id;
            if (id) {
                await db.delete(users).where(eq(users.clerkUserId, id));
            }
        }

        res.json({ ok: true });

    }catch(err){
        // Bad signature, malformed payload, or DB error — do not leak details to the client.
        console.error("Clerk webhook error", err);
        res.status(400).json({ error: "Invalid webhook" });
    }

}