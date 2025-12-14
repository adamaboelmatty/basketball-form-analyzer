import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { type PurchasesPackage } from "react-native-purchases";

import useOnboardingStore from "../state/onboardingStore";
import useCoachingStore from "../state/coachingStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import {
  isRevenueCatEnabled,
  getOfferings,
  purchasePackage,
  restorePurchases,
  hasEntitlement,
} from "../lib/revenuecatClient";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PaywallRouteProp = RouteProp<RootStackParamList, "Paywall">;

const ENTITLEMENT_ID = "pro";

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaywallRouteProp>();

  // Check if we came from onboarding flow
  const fromOnboarding = route.params?.fromOnboarding ?? false;

  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const setPro = useCoachingStore((s) => s.setPro);

  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly">("annual");
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    setIsLoading(true);
    setError(null);

    if (!isRevenueCatEnabled()) {
      setIsLoading(false);
      return;
    }

    const result = await getOfferings();

    if (result.ok && result.data.current) {
      const packages = result.data.current.availablePackages;

      const monthly = packages.find(
        (pkg) => pkg.identifier === "$rc_monthly"
      );
      const annual = packages.find(
        (pkg) => pkg.identifier === "$rc_annual"
      );

      setMonthlyPackage(monthly || null);
      setAnnualPackage(annual || null);
    } else if (!result.ok) {
      console.log("Failed to load offerings:", result.reason);
    }

    setIsLoading(false);
  };

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If coming from onboarding, complete it and go to account creation
    if (fromOnboarding) {
      completeOnboarding();
      navigation.replace("CreateAccount");
    } else {
      navigation.goBack();
    }
  };

  const handleSubscribe = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const selectedPackage = selectedPlan === "annual" ? annualPackage : monthlyPackage;

    if (!selectedPackage) {
      // RevenueCat not configured - proceed without purchase
      if (fromOnboarding) {
        completeOnboarding();
        navigation.replace("CreateAccount");
      } else {
        navigation.goBack();
      }
      return;
    }

    setIsPurchasing(true);
    setError(null);

    const result = await purchasePackage(selectedPackage);

    if (result.ok) {
      // Check if pro entitlement is now active
      const entitlementResult = await hasEntitlement(ENTITLEMENT_ID);
      if (entitlementResult.ok && entitlementResult.data) {
        setPro(true);
      }

      // Navigate after successful purchase
      if (fromOnboarding) {
        completeOnboarding();
        navigation.replace("CreateAccount");
      } else {
        navigation.goBack();
      }
    } else {
      // Handle purchase failure
      if (result.reason === "sdk_error") {
        // Check if user cancelled
        const errorMessage = String(result.error || "");
        if (errorMessage.includes("cancelled") || errorMessage.includes("canceled")) {
          // User cancelled - do nothing
        } else {
          setError("Purchase failed. Please try again.");
        }
      }
    }

    setIsPurchasing(false);
  };

  const handleRestore = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!isRevenueCatEnabled()) {
      setError("Purchases not available");
      return;
    }

    setIsRestoring(true);
    setError(null);

    const result = await restorePurchases();

    if (result.ok) {
      const entitlementResult = await hasEntitlement(ENTITLEMENT_ID);
      if (entitlementResult.ok && entitlementResult.data) {
        setPro(true);

        if (fromOnboarding) {
          completeOnboarding();
          navigation.replace("CreateAccount");
        } else {
          navigation.goBack();
        }
      } else {
        setError("No previous purchases found");
      }
    } else {
      setError("Failed to restore purchases");
    }

    setIsRestoring(false);
  };

  const benefits = [
    { icon: "infinite" as const, text: "Unlimited shot analyses" },
    { icon: "locate" as const, text: "Know what to work on every practice" },
    { icon: "trending-up" as const, text: "Track your improvement over time" },
  ];

  const formatPrice = (pkg: PurchasesPackage | null, fallback: string) => {
    if (!pkg) return fallback;
    return pkg.product.priceString;
  };

  const getMonthlyEquivalent = (pkg: PurchasesPackage | null) => {
    if (!pkg) return "$7.50";
    const price = pkg.product.price;
    const monthly = price / 12;
    return `$${monthly.toFixed(2)}`;
  };

  return (
    <View className="flex-1 bg-neutral-950">
      <LinearGradient
        colors={["#171717", "#0a0a0a"]}
        style={{ flex: 1 }}
      >
        {/* Close Button - only show if not from onboarding flow */}
        <View
          className="flex-row justify-end px-5"
          style={{ paddingTop: insets.top + 10 }}
        >
          {!fromOnboarding && (
            <Pressable
              onPress={handleClose}
              className="w-10 h-10 rounded-full bg-neutral-800/50 items-center justify-center active:opacity-70"
            >
              <Ionicons name="close" size={24} color="#a3a3a3" />
            </Pressable>
          )}
        </View>

        <View className="flex-1 px-6 justify-center">
          {/* Social Proof */}
          <Animated.View
            entering={FadeInDown.delay(50).duration(500)}
            className="items-center mb-6"
          >
            <Text className="text-neutral-500 text-sm">
              Trusted by serious players and coaches.
            </Text>
          </Animated.View>

          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(500)}
            className="mb-10"
          >
            <Text className="text-white text-3xl font-bold text-center leading-tight">
              Keep improving{"\n"}your shot.
            </Text>
            <Text className="text-neutral-400 text-base text-center mt-4 leading-6">
              Get ongoing coach-backed guidance, focus, and progress feedback.
            </Text>
          </Animated.View>

          {/* Benefits - Max 3 */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(500)}
            className="mb-10"
          >
            {benefits.map((benefit, index) => (
              <View
                key={index}
                className="flex-row items-center py-4 border-b border-neutral-800/50"
              >
                <View className="w-10 h-10 rounded-full bg-orange-500/10 items-center justify-center">
                  <Ionicons name={benefit.icon} size={20} color="#f97316" />
                </View>
                <Text className="text-white text-base ml-4 flex-1">
                  {benefit.text}
                </Text>
              </View>
            ))}
          </Animated.View>

          {/* Loading State */}
          {isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator color="#f97316" />
            </View>
          ) : (
            /* Pricing Options */
            <Animated.View entering={FadeInUp.delay(300).duration(500)}>
              {/* Best Value - Annual */}
              <Pressable
                onPress={() => setSelectedPlan("annual")}
                className="active:scale-98 mb-3"
              >
                <View
                  className={`rounded-2xl p-4 border ${
                    selectedPlan === "annual"
                      ? "bg-orange-500/10 border-orange-500/30"
                      : "bg-neutral-900 border-neutral-800"
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <View className="flex-row items-center">
                        <Text className="text-white text-lg font-semibold">
                          {formatPrice(annualPackage, "$89.99")}/year
                        </Text>
                        <View className="bg-orange-500 px-2 py-0.5 rounded ml-2">
                          <Text className="text-white text-xs font-semibold">
                            BEST VALUE
                          </Text>
                        </View>
                      </View>
                      <Text className="text-neutral-400 text-sm mt-1">
                        {getMonthlyEquivalent(annualPackage)}/month • Save 50%
                      </Text>
                    </View>
                    <View
                      className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                        selectedPlan === "annual"
                          ? "border-orange-500"
                          : "border-neutral-600"
                      }`}
                    >
                      {selectedPlan === "annual" && (
                        <View className="w-3 h-3 rounded-full bg-orange-500" />
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>

              {/* Monthly */}
              <Pressable
                onPress={() => setSelectedPlan("monthly")}
                className="active:scale-98 mb-6"
              >
                <View
                  className={`rounded-2xl p-4 border ${
                    selectedPlan === "monthly"
                      ? "bg-orange-500/10 border-orange-500/30"
                      : "bg-neutral-900 border-neutral-800"
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-white text-lg font-semibold">
                        {formatPrice(monthlyPackage, "$14.99")}/month
                      </Text>
                      <Text className="text-neutral-400 text-sm mt-1">
                        Cancel anytime
                      </Text>
                    </View>
                    <View
                      className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                        selectedPlan === "monthly"
                          ? "border-orange-500"
                          : "border-neutral-600"
                      }`}
                    >
                      {selectedPlan === "monthly" && (
                        <View className="w-3 h-3 rounded-full bg-orange-500" />
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>

              {/* Error Message */}
              {error && (
                <View className="mb-4">
                  <Text className="text-red-400 text-sm text-center">{error}</Text>
                </View>
              )}

              {/* CTA Button */}
              <Pressable
                onPress={handleSubscribe}
                disabled={isPurchasing}
                className="active:scale-98"
              >
                <LinearGradient
                  colors={["#f97316", "#ea580c"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 16,
                    padding: 18,
                    alignItems: "center",
                    opacity: isPurchasing ? 0.7 : 1,
                  }}
                >
                  {isPurchasing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-lg font-semibold">
                      Continue with Pro
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Not Now */}
              <Pressable
                onPress={handleClose}
                disabled={isPurchasing}
                className="mt-4 py-3 active:opacity-70"
              >
                <Text className="text-neutral-500 text-base text-center">
                  Not now
                </Text>
              </Pressable>
            </Animated.View>
          )}
        </View>

        {/* Footer */}
        <View
          className="px-6"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <Pressable
            onPress={handleRestore}
            disabled={isRestoring || isPurchasing}
            className="py-2 active:opacity-70"
          >
            <Text className="text-neutral-500 text-xs text-center">
              {isRestoring ? "Restoring..." : "Restore purchases"}
            </Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}
