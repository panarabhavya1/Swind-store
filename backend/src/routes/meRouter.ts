// meRouter.ts is use to handle the /api/me route, which is used to get the current user's information. 
import { getAuth } from "@clerk/express";
import { Router } from "express";
import { getLocalUser } from "../lib/users";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const { userId, isAuthenticated } = getAuth(req);
    if (!isAuthenticated || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    } // if the user is not authenticated, return a 401 error

    const user = await getLocalUser(userId);

    res.json({ user });
  } catch (e) {
    next(e);
  }
});

export default router;