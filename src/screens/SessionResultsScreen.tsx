import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/RootNavigator";
import {
  SessionMetricsSummary,
  ConfidenceSummary,
  MetricTrend,
  DepthTendency,
  LeftRightTendency,
  ConsistencyTrend,
} from "../types/session-analysis";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type SessionResultsRouteProp = RouteProp<RootStackParamList, "SessionResults">;

// Mock data for now - will be replaced with real backend data
const mockMetrics: SessionMetricsSummary = {
  arcTrend: "higher",
  depthTendency: "short",
  leftRightTendency: "centered",
  consistencyTrend: "improving",
};

const mockConfidence: ConfidenceSummary = {
  attemptsAnalyzed: 8,
  attemptsUnclear: 1,
  overallConfidence: "high",
  notes: [],
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  description: string;
  delay: number;
}

function MetricCard({
  title,
  value,
  icon,
  color,
  bgColor,
  description,
  delay,
}: MetricCardProps) {
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(500)}
      className="w-[48%] mb-3"
    >
      <View
        className="rounded-2xl p-4 border"
        style={{
          backgroundColor: bgColor,
          borderColor: color + "30",
        }}
      >
        <View className="flex-row items-center mb-2">
          <View
            className="w-8 h-8 rounded-lg items-center justify-center mr-2"
            style={{ backgroundColor: color + "20" }}
          >
            <Ionicons name={icon} size={18} color={color} />
          </View>
          <Text className="text-neutral-400 text-sm">{title}</Text>
        </View>
        <Text className="text-white text-xl font-bold mb-1">{value}</Text>
        <Text className="text-neutral-500 text-xs">{description}</Text>
      </View>
    </Animated.View>
  );
}

function getArcDisplay(trend: MetricTrend): { value: string; description: string } {
  switch (trend) {
    case "higher":
      return { value: "Higher", description: "Arc trending up from baseline" };
    case "lower":
      return { value: "Lower", description: "Arc trending down from baseline" };
    case "stable":
      return { value: "Stable", description: "Consistent arc height" };
  }
}

function getDepthDisplay(tendency: DepthTendency): { value: string; description: string } {
  switch (tendency) {
    case "short":
      return { value: "Short", description: "Shots landing front of rim" };
    case "long":
      return { value: "Long", description: "Shots landing back of rim" };
    case "centered":
      return { value: "Centered", description: "Good depth control" };
  }
}

function getLeftRightDisplay(tendency: LeftRightTendency | null): { value: string; description: string } {
  if (!tendency) {
    return { value: "N/A", description: "Side angle - not measured" };
  }
  switch (tendency) {
    case "left":
      return { value: "Left", description: "Trending left of center" };
    case "right":
      return { value: "Right", description: "Trending right of center" };
    case "centered":
      return { value: "Centered", description: "Good left-right alignment" };
  }
}

function getConsistencyDisplay(trend: ConsistencyTrend): { value: string; description: string } {
  switch (trend) {
    case "improving":
      return { value: "Improving", description: "More consistent than before" };
    case "mixed":
      return { value: "Mixed", description: "Some variation in shots" };
    case "unstable":
      return { value: "Unstable", description: "High variation between shots" };
  }
}

export default function SessionResultsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SessionResultsRouteProp>();

  const sessionId = route.params.sessionId;

  // TODO: Fetch real data from backend using sessionId
  const metrics = mockMetrics;
  const confidence = mockConfidence;

  const arcDisplay = getArcDisplay(metrics.arcTrend);
  const depthDisplay = getDepthDisplay(metrics.depthTendency);
  const lrDisplay = getLeftRightDisplay(metrics.leftRightTendency);
  const consistencyDisplay = getConsistencyDisplay(metrics.consistencyTrend);

  const handleDone = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("MainTabs");
  };

  // Determine coach focus based on metrics (the bridge)
  const getCoachFocus = (): string => {
    // Priority: consistency issues > depth issues > arc issues > LR issues
    if (metrics.consistencyTrend === "unstable") {
      return "Focus on a consistent release point";
    }
    if (metrics.depthTendency === "short") {
      return "Work on follow-through extension";
    }
    if (metrics.depthTendency === "long") {
      return "Soften your release";
    }
    if (metrics.arcTrend === "lower") {
      return "Aim for a higher arc";
    }
    if (metrics.leftRightTendency === "left" || metrics.leftRightTendency === "right") {
      return "Check your elbow alignment";
    }
    return "Keep up the good work!";
  };

  return (
    <View className="flex-1 bg-neutral-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          className="items-center mb-6"
        >
          <View className="w-16 h-16 rounded-full bg-green-500/20 items-center justify-center mb-4">
            <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
          </View>
          <Text className="text-white text-2xl font-bold text-center">
            Session Complete
          </Text>
          <Text className="text-neutral-400 text-base text-center mt-1">
            {confidence.attemptsAnalyzed} shots analyzed
            {confidence.attemptsUnclear > 0 &&
              ` (${confidence.attemptsUnclear} unclear)`}
          </Text>
        </Animated.View>

        {/* Metric Cards */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(500)}
          className="mb-6"
        >
          <Text className="text-neutral-500 text-sm font-medium uppercase tracking-wide mb-3">
            Shot Metrics
          </Text>
          <View className="flex-row flex-wrap justify-between">
            <MetricCard
              title="Arc"
              value={arcDisplay.value}
              icon="trending-up"
              color="#f97316"
              bgColor="rgba(249, 115, 22, 0.05)"
              description={arcDisplay.description}
              delay={250}
            />
            <MetricCard
              title="Depth"
              value={depthDisplay.value}
              icon="resize"
              color="#3b82f6"
              bgColor="rgba(59, 130, 246, 0.05)"
              description={depthDisplay.description}
              delay={300}
            />
            <MetricCard
              title="Left-Right"
              value={lrDisplay.value}
              icon="swap-horizontal"
              color="#8b5cf6"
              bgColor="rgba(139, 92, 246, 0.05)"
              description={lrDisplay.description}
              delay={350}
            />
            <MetricCard
              title="Consistency"
              value={consistencyDisplay.value}
              icon="analytics"
              color="#22c55e"
              bgColor="rgba(34, 197, 94, 0.05)"
              description={consistencyDisplay.description}
              delay={400}
            />
          </View>
        </Animated.View>

        {/* Coach Bridge - The Magic */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(500)}
          className="mb-6"
        >
          <View className="bg-orange-500/10 rounded-2xl p-5 border border-orange-500/20">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-full bg-orange-500/20 items-center justify-center mr-3">
                <Ionicons name="fitness" size={22} color="#f97316" />
              </View>
              <Text className="text-orange-400 text-sm font-semibold uppercase tracking-wide">
                Coach Recommendation
              </Text>
            </View>
            <Text className="text-white text-lg font-medium leading-6">
              Based on this session, your coach wants you focusing on:
            </Text>
            <Text className="text-orange-300 text-xl font-bold mt-2">
              {getCoachFocus()}
            </Text>
          </View>
        </Animated.View>

        {/* Info Note */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(500)}
          className="mb-8"
        >
          <View className="flex-row items-start bg-neutral-900/50 rounded-xl p-4">
            <Ionicons
              name="information-circle"
              size={20}
              color="#737373"
              style={{ marginTop: 2 }}
            />
            <Text className="text-neutral-500 text-sm ml-3 flex-1 leading-5">
              These are trends, not exact measurements. Use them to guide your
              practice focus, not to obsess over numbers.
            </Text>
          </View>
        </Animated.View>

        {/* Done Button */}
        <Animated.View entering={FadeInUp.delay(700).duration(500)}>
          <Pressable
            onPress={handleDone}
            className="bg-white rounded-2xl py-4 items-center active:opacity-90"
          >
            <Text className="text-black text-lg font-semibold">Done</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
