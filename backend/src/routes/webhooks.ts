import { Router, Request, Response } from "express";
import { updateProStatus } from "../services/firestore";

const router = Router();

/**
 * POST /webhooks/revenuecat
 * RevenueCat webhook endpoint - automatically syncs purchases
 *
 * To configure in RevenueCat dashboard:
 * 1. Go to Project Settings → Integrations → Webhooks
 * 2. Add webhook URL: https://arc-api-564361317418.us-central1.run.app/webhooks/revenuecat
 * 3. Enable events: INITIAL_PURCHASE, RENEWAL, NON_RENEWING_PURCHASE
 * 4. Set Authorization header (optional but recommended)
 */
router.post("/revenuecat", async (req: Request, res: Response) => {
  try {
    const event = req.body;

    console.log("[revenuecat-webhook] Received event:", event.type);

    // Handle purchase events
    if (
      event.type === "INITIAL_PURCHASE" ||
      event.type === "RENEWAL" ||
      event.type === "NON_RENEWING_PURCHASE"
    ) {
      const appUserId = event.event?.app_user_id;
      const productId = event.event?.product_id;
      const entitlements = event.event?.entitlements || [];

      console.log(
        `[revenuecat-webhook] Purchase event for user ${appUserId}, product ${productId}`
      );

      // Check if user has "pro" entitlement
      const hasPro = entitlements.some(
        (e: any) => e.toLowerCase() === "pro" && e.expires_date === null
      );

      if (hasPro && appUserId) {
        // Update Firestore to set isPro: true
        await updateProStatus(appUserId, true, appUserId);
        console.log(`[revenuecat-webhook] Set isPro=true for user ${appUserId}`);
      }
    }

    // Handle cancellation/expiration events
    if (
      event.type === "CANCELLATION" ||
      event.type === "EXPIRATION" ||
      event.type === "BILLING_ISSUE"
    ) {
      const appUserId = event.event?.app_user_id;
      const entitlements = event.event?.entitlements || [];

      // Check if user still has active pro entitlement
      const hasPro = entitlements.some(
        (e: any) => e.toLowerCase() === "pro" && e.expires_date === null
      );

      if (!hasPro && appUserId) {
        // Update Firestore to set isPro: false
        await updateProStatus(appUserId, false, appUserId);
        console.log(`[revenuecat-webhook] Set isPro=false for user ${appUserId}`);
      }
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("[revenuecat-webhook] Error processing webhook:", error);
    // Still return 200 to prevent RevenueCat from retrying
    res.status(200).json({ received: true, error: "Processing failed" });
  }
});

export default router;
