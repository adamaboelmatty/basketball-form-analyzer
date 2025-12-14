import React, { useState } from "react";
import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import useOnboardingStore from "../state/onboardingStore";
import useUserStore, { saveAuthTokens } from "../state/userStore";
import { RootStackParamList } from "../navigation/RootNavigator";
import {
  signInWithEmail,
  getAuthErrorMessage,
} from "../api/firebase-auth";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeAccountCreation = useOnboardingStore((s) => s.completeAccountCreation);
  const setUser = useUserStore((s) => s.setUser);

  const handleAppleSignIn = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Apple Sign-In requires additional native setup in your Apple Developer account
    // For now, show a message directing users to use email
    setError("Apple Sign-In requires additional setup. Please use email for now.");
  };

  const handleEmailSignIn = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    setIsLoading(true);

    try {
      const firebaseUser = await signInWithEmail(email, password);

      // Save auth tokens for API requests
      await saveAuthTokens({
        idToken: firebaseUser.idToken,
        refreshToken: firebaseUser.refreshToken,
        expiresAt: Date.now() + firebaseUser.expiresIn * 1000,
      });

      // Save user info
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        authMethod: "email",
        createdAt: new Date().toISOString(),
      });

      completeAccountCreation();
      navigation.replace("MainTabs");
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = email.includes("@") && email.includes(".");
  const isValidPassword = password.length >= 6;
  const canSubmit = isValidEmail && isValidPassword && !isLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-neutral-950"
    >
      <LinearGradient
        colors={["#171717", "#0a0a0a"]}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(500)}
            className="mb-8"
          >
            <Text className="text-white text-2xl font-bold text-center">
              Welcome back
            </Text>
            <Text className="text-neutral-400 text-base text-center mt-2">
              Sign in to continue your basketball journey
            </Text>
          </Animated.View>

          {/* Apple Sign In - Disabled for now */}
          <Animated.View entering={FadeInUp.delay(200).duration(500)}>
            <Pressable
              onPress={handleAppleSignIn}
              disabled={isLoading}
              className="bg-neutral-800 rounded-xl p-4 flex-row items-center justify-center active:opacity-90 mb-2"
              style={{ opacity: 0.5 }}
            >
              <Ionicons name="logo-apple" size={22} color="#fff" />
              <Text className="text-white text-base font-semibold ml-2">
                Continue with Apple
              </Text>
            </Pressable>
            <Text className="text-neutral-500 text-xs text-center mb-4">
              Coming soon - use email below
            </Text>
          </Animated.View>

          {/* Divider */}
          <Animated.View
            entering={FadeInUp.delay(250).duration(500)}
            className="flex-row items-center mb-6"
          >
            <View className="flex-1 h-px bg-neutral-800" />
            <Text className="text-neutral-500 text-sm mx-4">or</Text>
            <View className="flex-1 h-px bg-neutral-800" />
          </Animated.View>

          {/* Error Message */}
          {error && (
            <Animated.View entering={FadeInDown.duration(300)} className="mb-4">
              <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <Text className="text-red-400 text-sm text-center">{error}</Text>
              </View>
            </Animated.View>
          )}

          {/* Email Input */}
          <Animated.View entering={FadeInUp.delay(300).duration(500)} className="mb-4">
            <Text className="text-neutral-400 text-sm mb-2">Email</Text>
            <View className="bg-neutral-900 rounded-xl border border-neutral-800 px-4 py-3">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor="#525252"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                className="text-white text-base"
              />
            </View>
          </Animated.View>

          {/* Password Input */}
          <Animated.View entering={FadeInUp.delay(350).duration(500)} className="mb-6">
            <Text className="text-neutral-400 text-sm mb-2">Password</Text>
            <View className="bg-neutral-900 rounded-xl border border-neutral-800 px-4 py-3 flex-row items-center">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#525252"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                className="text-white text-base flex-1"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="ml-2"
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#737373"
                />
              </Pressable>
            </View>
          </Animated.View>

          {/* Sign In Button */}
          <Animated.View entering={FadeInUp.delay(400).duration(500)}>
            <Pressable
              onPress={handleEmailSignIn}
              disabled={!canSubmit}
              className="active:scale-98"
              style={{ opacity: canSubmit ? 1 : 0.5 }}
            >
              <LinearGradient
                colors={["#f97316", "#ea580c"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 16,
                  padding: 18,
                  alignItems: "center",
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-lg font-semibold">
                    Sign In
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Sign Up Link */}
          <Animated.View entering={FadeInUp.delay(450).duration(500)}>
            <Pressable 
              onPress={() => navigation.navigate("CreateAccount")}
              className="mt-6"
            >
              <Text className="text-neutral-400 text-sm text-center">
                {"Don't have an account?"}{" "}
                <Text className="text-orange-500 font-semibold">
                  Sign Up
                </Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
