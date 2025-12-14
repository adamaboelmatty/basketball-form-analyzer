import React from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import useCoachingStore from "../state/coachingStore";
import useUserStore from "../state/userStore";
import { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MetricCircleProps {
  value: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  delay: number;
}

function MetricCircle({ value, label, icon, delay }: MetricCircleProps) {
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(500)}
      className="items-center flex-1"
    >
      <View className="w-20 h-20 rounded-full bg-orange-500/10 border-2 border-orange-500/30 items-center justify-center mb-3">
        <Text className="text-white text-2xl font-bold">{value}</Text>
      </View>
      <View className="items-center mb-1">
        <Ionicons name={icon} size={14} color="#737373" />
      </View>
      <Text className="text-neutral-400 text-xs text-center">{label}</Text>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const currentFocus = useCoachingStore((s) => s.currentFocus);
  const sessions = useCoachingStore((s) => s.sessions);
  const totalAnalyses = useCoachingStore((s) => s.totalAnalyses);
  const canAnalyze = useCoachingStore((s) => s.canAnalyze);
  const user = useUserStore((s) => s.user);

  const lastSession = sessions[0];
  const streak = sessions.length; // Simplified - could track actual daily streak

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Get first name from user
  const getFirstName = () => {
    if (user?.displayName) {
      return user.displayName.split(" ")[0];
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "there";
  };

  const handleAnalyzeShot = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (canAnalyze()) {
      navigation.navigate("VideoCapture");
    } else {
      navigation.navigate("Paywall");
    }
  };

  const handleAnalyzeSession = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (canAnalyze()) {
      navigation.navigate("SessionCaptureGuidance");
    } else {
      navigation.navigate("Paywall");
    }
  };

  const handleProfilePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Profile");
  };

  return (
    <View className="flex-1 bg-neutral-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: 140,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - Logo and Name */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          className="flex-row items-center justify-between mb-8"
        >
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-orange-500/20 items-center justify-center mr-3">
              <Ionicons name="basketball" size={22} color="#f97316" />
            </View>
            <Image
              source={require("../../assets/wordmark-white.png")}
              style={{ width: 60, height: 20 }}
              resizeMode="contain"
            />
          </View>
          <Pressable
            onPress={handleProfilePress}
            className="w-10 h-10 rounded-full bg-neutral-900 items-center justify-center active:opacity-70"
          >
            <Ionicons name="person-outline" size={20} color="#a3a3a3" />
          </Pressable>
        </Animated.View>

        {/* Dynamic Welcome Message */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(500)}
          className="mb-8"
        >
          <Text className="text-neutral-400 text-sm mb-1">
            {getGreeting()},
          </Text>
          <Text className="text-white text-3xl font-bold">
            {getFirstName()} 👋
          </Text>
        </Animated.View>

        {/* 3 Circle Metrics */}
        <View className="flex-row justify-between mb-8">
          <MetricCircle
            value={totalAnalyses.toString()}
            label="Total Shots"
            icon="videocam"
            delay={200}
          />
          <MetricCircle
            value={streak.toString()}
            label="Sessions"
            icon="flame"
            delay={250}
          />
          <MetricCircle
            value={currentFocus ? "1" : "0"}
            label="Active Focus"
            icon="locate"
            delay={300}
          />
        </View>

        {/* Current Focus Card */}
        <Animated.View entering={FadeInUp.delay(350).duration(500)} className="mb-6">
          {currentFocus && lastSession ? (
            <View className="bg-orange-500/10 rounded-2xl p-5 border border-orange-500/20">
              <View className="flex-row items-center mb-3">
                <Ionicons name="locate" size={16} color="#f97316" />
                <Text className="text-orange-500 text-xs font-semibold ml-2 uppercase tracking-wide">
                  Your Current Focus
                </Text>
              </View>
              <Text className="text-white text-lg font-semibold leading-6">
                {lastSession.feedback.primaryFocus}
              </Text>
            </View>
          ) : (
            <View className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800">
              <View className="flex-row items-center mb-3">
                <Ionicons name="locate-outline" size={16} color="#737373" />
                <Text className="text-neutral-500 text-xs font-semibold ml-2 uppercase tracking-wide">
                  No Active Focus
                </Text>
              </View>
              <Text className="text-neutral-400 text-sm">
                Upload a clip to get your first coaching focus.
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Quick Actions Section */}
        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <View className="flex-row items-center mb-4">
            <Ionicons name="flash" size={18} color="#f97316" />
            <Text className="text-white text-base font-semibold ml-2">
              Quick Actions
            </Text>
          </View>

          {/* Primary Action - Analyze a Shot */}
          <Pressable
            onPress={handleAnalyzeShot}
            className="active:scale-98 mb-3"
          >
            <LinearGradient
              colors={["#f97316", "#ea580c"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 16,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-4">
                <Ionicons name="videocam" size={24} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-lg font-semibold">
                  Analyze a Shot
                </Text>
                <Text className="text-orange-100 text-xs mt-0.5">
                  Quick feedback from your coach
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>

          {/* Secondary Action - Analyze a Session */}
          <Pressable
            onPress={handleAnalyzeSession}
            className="active:scale-98"
          >
            <View className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800 flex-row items-center">
              <View className="w-12 h-12 rounded-full bg-neutral-800 items-center justify-center mr-4">
                <Ionicons name="analytics-outline" size={24} color="#a3a3a3" />
              </View>
              <View className="flex-1">
                <Text className="text-neutral-300 text-base font-medium">
                  Analyze a Session
                </Text>
                <Text className="text-neutral-500 text-xs mt-0.5">
                  Best for 5-10 free throws
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#737373" />
            </View>
          </Pressable>
        </Animated.View>

        {/* Soft Reminder */}
        {currentFocus && (
          <Animated.View
            entering={FadeInUp.delay(500).duration(500)}
            className="mt-6"
          >
            <View className="bg-neutral-900/50 rounded-xl p-4 flex-row items-start">
              <Ionicons name="information-circle-outline" size={18} color="#737373" style={{ marginTop: 1 }} />
              <Text className="text-neutral-500 text-xs ml-3 flex-1 leading-5">
                Stick with the same focus for best results. Your consistency builds better form.
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
