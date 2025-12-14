// RevenueCat Integration Service
// Handles in-app purchases and subscription management
// react-native-purchases is already installed in the project

import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from "react-native-purchases";

// RevenueCat API key - should be set in environment variable
const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || "";

// Product identifiers
export const PRODUCT_IDS = {
  MONTHLY: "shooting_lab_pro_monthly",
  ANNUAL: "shooting_lab_pro_annual",
} as const;

// Entitlement identifier
export const ENTITLEMENT_ID = "pro";

let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Call this once at app startup
 */
export async function initializeRevenueCat(appUserId?: string): Promise<void> {
  if (isInitialized) return;

  if (!REVENUECAT_API_KEY) {
    console.warn("RevenueCat API key not configured. Purchases will not work.");
    return;
  }

  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);

    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: appUserId,
    });

    isInitialized = true;
    console.log("RevenueCat initialized successfully");
  } catch (error) {
    console.error("Failed to initialize RevenueCat:", error);
  }
}

/**
 * Set the user ID after login/signup
 */
export async function setRevenueCatUserId(userId: string): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  } catch (error) {
    console.error("Failed to set RevenueCat user ID:", error);
    return null;
  }
}

/**
 * Clear user on logout
 */
export async function clearRevenueCatUser(): Promise<void> {
  try {
    await Purchases.logOut();
  } catch (error) {
    console.error("Failed to clear RevenueCat user:", error);
  }
}

/**
 * Get available offerings (products)
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error("Failed to get offerings:", error);
    return null;
  }
}

/**
 * Get specific packages from the current offering
 */
export async function getPackages(): Promise<{
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
}> {
  const offering = await getOfferings();

  if (!offering) {
    return { monthly: null, annual: null };
  }

  return {
    monthly: offering.monthly || null,
    annual: offering.annual || null,
  };
}

/**
 * Purchase a package
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{
  success: boolean;
  customerInfo: CustomerInfo | null;
  error?: string;
}> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);

    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    return {
      success: isPro,
      customerInfo,
    };
  } catch (error: unknown) {
    // Check if user cancelled
    if (
      error &&
      typeof error === "object" &&
      "userCancelled" in error &&
      (error as { userCancelled: boolean }).userCancelled
    ) {
      return {
        success: false,
        customerInfo: null,
        error: "Purchase cancelled",
      };
    }

    console.error("Purchase failed:", error);
    return {
      success: false,
      customerInfo: null,
      error: "Purchase failed. Please try again.",
    };
  }
}

/**
 * Restore purchases
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  isPro: boolean;
  customerInfo: CustomerInfo | null;
  error?: string;
}> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    return {
      success: true,
      isPro,
      customerInfo,
    };
  } catch (error) {
    console.error("Restore failed:", error);
    return {
      success: false,
      isPro: false,
      customerInfo: null,
      error: "Failed to restore purchases. Please try again.",
    };
  }
}

/**
 * Check if user has Pro entitlement
 */
export async function checkProStatus(): Promise<{
  isPro: boolean;
  expirationDate?: string;
}> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const proEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

    return {
      isPro: proEntitlement !== undefined,
      expirationDate: proEntitlement?.expirationDate || undefined,
    };
  } catch (error) {
    console.error("Failed to check pro status:", error);
    return { isPro: false };
  }
}

/**
 * Get customer info
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error("Failed to get customer info:", error);
    return null;
  }
}

/**
 * Add listener for customer info changes
 */
export function addCustomerInfoListener(
  callback: (customerInfo: CustomerInfo) => void
): () => void {
  Purchases.addCustomerInfoUpdateListener(callback);
  // Return a no-op cleanup function since the SDK manages listeners internally
  return () => {
    // Listener cleanup is handled by RevenueCat SDK
  };
}

/**
 * Format price for display
 */
export function formatPrice(pkg: PurchasesPackage): string {
  return pkg.product.priceString;
}

/**
 * Get subscription period text
 */
export function getSubscriptionPeriod(pkg: PurchasesPackage): string {
  const identifier = pkg.packageType;

  switch (identifier) {
    case "MONTHLY":
      return "month";
    case "ANNUAL":
      return "year";
    case "WEEKLY":
      return "week";
    case "LIFETIME":
      return "lifetime";
    default:
      return "period";
  }
}
