import React from "react";
import { View, Text, Pressable, ScrollView, Alert, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import useCoachingStore from "../state/coachingStore";
import useOnboardingStore from "../state/onboardingStore";
import useUserStore from "../state/userStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import { restorePurchases, hasEntitlement } from "../lib/revenuecatClient";
import { syncPurchase } from "../api/backend-api";
import { getDeviceId } from "../api/analysis-service";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const isPro = useCoachingStore((s) => s.isPro);
  const setPro = useCoachingStore((s) => s.setPro);
  const totalAnalyses = useCoachingStore((s) => s.totalAnalyses);
  const resetCoachingStore = useCoachingStore((s) => s.resetStore);
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);

  const handleRestorePurchases = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Restore purchases from RevenueCat
      const restoreResult = await restorePurchases();

      if (!restoreResult.ok) {
        Alert.alert("Restore Failed", "Could not restore purchases. Please try again.");
        return;
      }

      // Check if user has Pro entitlement
      const proResult = await hasEntitlement("pro");

      if (proResult.ok && proResult.data) {
        // User has Pro - sync with backend
        try {
          const deviceId = await getDeviceId();
          await syncPurchase({ receiptData: "restored", deviceId });
          setPro(true);
          Alert.alert("Success", "Your Pro subscription has been restored!");
        } catch (syncError) {
          console.error("Failed to sync purchase with backend:", syncError);
          // Still set local Pro status even if backend sync fails
          setPro(true);
          Alert.alert("Restored", "Your Pro subscription has been restored locally. Some features may require re-syncing.");
        }
      } else {
        Alert.alert("No Purchases Found", "No previous Pro subscription was found for this account.");
      }
    } catch (error) {
      console.error("Restore purchases error:", error);
      Alert.alert("Error", "An error occurred while restoring purchases.");
    }
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const handleUpgrade = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Paywall");
  };

  const handleSignOut = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      "Sign Out",
      "This will reset all your data and return you to the onboarding flow. Are you sure?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            // Reset all stores
            resetCoachingStore();
            resetOnboarding();
            clearUser();

            // Navigate to onboarding
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "Onboarding" }],
              })
            );
          },
        },
      ]
    );
  };

  // Format the member since date
  const getMemberSince = () => {
    if (!user?.createdAt) return null;
    const date = new Date(user.createdAt);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Get display name or email prefix
  const getDisplayName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split("@")[0];
    return "Player";
  };

  const menuItems = [
    {
      icon: "card-outline" as const,
      label: "Subscription",
      value: isPro ? "Pro" : "Free",
      onPress: handleUpgrade,
    },
    {
      icon: "refresh-outline" as const,
      label: "Restore Purchase",
      onPress: handleRestorePurchases,
    },
    {
      icon: "document-text-outline" as const,
      label: "Terms of Service",
      onPress: async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    },
    {
      icon: "shield-outline" as const,
      label: "Privacy Policy",
      onPress: async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    },
  ];

  return (
    <View className="flex-1 bg-neutral-950">
      {/* Header with Back Button */}
      <View
        className="flex-row items-center px-4 pb-4 border-b border-neutral-900"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 items-center justify-center rounded-full bg-neutral-900 active:bg-neutral-800"
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </Pressable>
        <Text className="flex-1 text-white text-lg font-semibold text-center mr-10">
          Profile
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 24,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Avatar & User Info */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-neutral-800 items-center justify-center mb-4">
            {user?.authMethod === "apple" ? (
              <Ionicons name="logo-apple" size={40} color="#ffffff" />
            ) : (
              <Text className="text-white text-3xl font-bold">
                {getDisplayName().charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          {/* Display Name */}
          <Text className="text-white text-xl font-semibold mb-1">
            {getDisplayName()}
          </Text>

          {/* Email */}
          {user?.email && (
            <Text className="text-neutral-400 text-sm mb-2">
              {user.email}
            </Text>
          )}

          {/* Stats Row */}
          <View className="flex-row items-center mt-2">
            <View className="items-center px-4">
              <Text className="text-white text-lg font-semibold">
                {totalAnalyses}
              </Text>
              <Text className="text-neutral-500 text-xs">
                {totalAnalyses === 1 ? "Analysis" : "Analyses"}
              </Text>
            </View>

            {getMemberSince() && (
              <>
                <View className="w-px h-8 bg-neutral-800" />
                <View className="items-center px-4">
                  <Text className="text-white text-sm font-medium">
                    {getMemberSince()}
                  </Text>
                  <Text className="text-neutral-500 text-xs">
                    Member since
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Plan Status Card */}
        <View className="bg-neutral-900 rounded-2xl p-4 mb-4 border border-neutral-800">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-neutral-400 text-xs uppercase tracking-wide mb-1">
                Current Plan
              </Text>
              <Text className="text-white text-lg font-semibold">
                {isPro ? "Pro" : "Free Trial"}
              </Text>
            </View>
            {!isPro && (
              <Pressable
                onPress={handleUpgrade}
                className="bg-orange-500 px-4 py-2 rounded-full active:opacity-80"
              >
                <Text className="text-white text-sm font-semibold">Upgrade</Text>
              </Pressable>
            )}
            {isPro && (
              <View className="bg-green-500/20 px-3 py-1.5 rounded-full">
                <Text className="text-green-500 text-xs font-semibold">Active</Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu Items */}
        <View className="bg-neutral-900 rounded-2xl overflow-hidden mb-6">
          {menuItems.map((item, index) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              className={`flex-row items-center justify-between p-4 active:bg-neutral-800 ${
                index < menuItems.length - 1 ? "border-b border-neutral-800" : ""
              }`}
            >
              <View className="flex-row items-center">
                <Ionicons name={item.icon} size={20} color="#737373" />
                <Text className="text-white text-base ml-3">
                  {item.label}
                </Text>
              </View>
              <View className="flex-row items-center">
                {item.value && (
                  <Text className="text-neutral-400 text-sm mr-2">
                    {item.value}
                  </Text>
                )}
                <Ionicons name="chevron-forward" size={18} color="#525252" />
              </View>
            </Pressable>
          ))}
        </View>

        {/* Sign Out Button */}
        <Pressable
          onPress={handleSignOut}
          className="bg-neutral-900 rounded-2xl p-4 active:bg-neutral-800 border border-neutral-800"
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text className="text-red-500 text-base font-medium ml-2">
              Sign Out
            </Text>
          </View>
        </Pressable>

        {/* App Version */}
        <View className="flex-row items-center justify-center mt-8">
          <Image
            source={require("../../assets/wordmark-white.png")}
            style={{ width: 36, height: 12, opacity: 0.4 }}
            resizeMode="contain"
          />
          <Text className="text-neutral-600 text-xs ml-1">v1.0.0</Text>
        </View>

        {/* Debug Info */}
        {user?.uid && (
          <View className="mt-6 bg-neutral-900/50 rounded-lg p-3 border border-neutral-800">
            <Text className="text-neutral-500 text-xs mb-1">User ID (for backend):</Text>
            <Text className="text-neutral-400 text-xs font-mono">{user.uid}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
