import { Router } from "express";
import { createCheckout } from "../controllers/checkoutController";

const router = Router();

router.post("/", createCheckout);

export default router;

// checkout is use after cart and before payment