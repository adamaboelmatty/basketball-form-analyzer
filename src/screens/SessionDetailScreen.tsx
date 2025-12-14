import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Video, ResizeMode } from "expo-av";
import { format } from "date-fns";

import useCoachingStore from "../state/coachingStore";
import { CORRECTION_LABELS } from "../types/coaching";
import { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "SessionDetail">;

// Score Display Component (static, no animation for saved sessions)
function ScoreDisplay({ score }: { score: number }) {
  const scale = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withSpring(1, {
      damping: 8,
      stiffness: 100,
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text className="text-white text-4xl font-bold">{score}</Text>
    </Animated.View>
  );
}

export default function SessionDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const { sessionId } = route.params;
  const getSessionById = useCoachingStore((s) => s.getSessionById);
  const session = getSessionById(sessionId);

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  if (!session) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center">
        <Text className="text-neutral-400">Session not found</Text>
        <Pressable
          onPress={handleBack}
          className="mt-4 px-6 py-3 bg-neutral-800 rounded-xl"
        >
          <Text className="text-white">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const { feedback } = session;
  const date = new Date(session.date);

  // Calculate form score based on correction category
  const getFormScore = (): number => {
    const categoryScores: Record<string, number> = {
      balance_verticality: 75,
      shot_line_integrity: 82,
      set_point_consistency: 88,
      release_follow_through: 92,
    };
    return categoryScores[feedback.correctionCategory] || 85;
  };

  const formScore = getFormScore();
  const getRating = (score: number): string => {
    if (score >= 90) return "Excellent Form";
    if (score >= 80) return "Strong Form";
    if (score >= 70) return "Good Foundation";
    return "Needs Work";
  };

  const getRatingColor = (score: number): string => {
    if (score >= 90) return "text-green-400";
    if (score >= 80) return "text-green-400";
    if (score >= 70) return "text-yellow-400";
    return "text-orange-400";
  };

  return (
    <View className="flex-1 bg-neutral-950">
      {/* Back Button */}
      <View
        className="absolute top-0 left-0 z-50"
        style={{ paddingTop: insets.top + 10, paddingLeft: 20 }}
      >
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 rounded-full bg-neutral-900 items-center justify-center active:opacity-70"
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 60,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Date */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)} className="mb-6">
          <Text className="text-white text-2xl font-bold text-center mb-2">
            Session Details
          </Text>
          <Text className="text-neutral-400 text-sm text-center">
            {format(date, "EEEE, MMMM d, yyyy")} • {format(date, "h:mm a")}
          </Text>
        </Animated.View>

        {/* PRIMARY FOCUS - Most Prominent */}
        <Animated.View
          entering={FadeInUp.delay(200).duration(500)}
          className="bg-gradient-to-b from-orange-500/20 to-orange-500/5 rounded-2xl p-5 mb-5 border-2 border-orange-500"
        >
          <View className="flex-row items-center mb-3">
            <View className="w-8 h-8 rounded-full bg-orange-500 items-center justify-center mr-3">
              <Ionicons name="radio-button-on" size={18} color="white" />
            </View>
            <Text className="text-orange-500 text-sm font-bold uppercase tracking-wider">
              Primary Focus
            </Text>
          </View>
          <Text className="text-white text-lg font-bold leading-7 mb-1">
            {feedback.primaryFocus}
          </Text>
          <View className="mt-3">
            <View className="bg-orange-500/20 self-start px-3 py-1 rounded-full">
              <Text className="text-orange-400 text-xs font-medium">
                {CORRECTION_LABELS[feedback.correctionCategory]}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Video and Score Row */}
        <Animated.View entering={FadeInUp.delay(350).duration(400)} className="mb-5">
          <View className="flex-row items-start mb-4">
            {/* Video Thumbnail */}
            <View className="mr-4">
              <View 
                className="rounded-xl overflow-hidden bg-neutral-900"
                style={{ width: 100, height: 160 }}
              >
                {session.videoUri ? (
                  <Video
                    source={{ uri: session.videoUri }}
                    rate={1.0}
                    volume={0.0}
                    isMuted={true}
                    shouldPlay={true}
                    isLooping={true}
                    resizeMode={ResizeMode.COVER}
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Ionicons name="videocam-off-outline" size={32} color="#525252" />
                  </View>
                )}
              </View>
            </View>

            {/* Score Display */}
            <View className="flex-1 justify-center">
              <View className="items-center">
                <View className="relative items-center justify-center mb-2">
                  <View 
                    className="items-center justify-center rounded-full border-3 border-green-500"
                    style={{ width: 90, height: 90 }}
                  >
                    <ScoreDisplay score={formScore} />
                  </View>
                </View>
                <Text className={`text-base font-bold mb-1 ${getRatingColor(formScore)}`}>
                  {getRating(formScore)}
                </Text>
                <Text className="text-neutral-500 text-xs">
                  Mechanics Score
                </Text>
              </View>
            </View>
          </View>

          {/* Coach Summary */}
          <View className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
            <View className="flex-row items-center mb-2">
              <Ionicons name="chatbubble-outline" size={14} color="#f97316" />
              <Text className="text-orange-500 text-xs font-semibold ml-2 uppercase tracking-wide">
                Coach Summary
              </Text>
            </View>
            <Text className="text-neutral-300 text-sm leading-6">
              {feedback.coachSummary}
            </Text>
          </View>
        </Animated.View>

        {/* Why It Matters */}
        <Animated.View
          entering={FadeInUp.delay(450).duration(400)}
          className="bg-neutral-900 rounded-xl p-4 mb-4 border border-neutral-800"
        >
          <View className="flex-row items-center mb-2">
            <Ionicons name="information-circle" size={16} color="#a3a3a3" />
            <Text className="text-neutral-400 text-xs uppercase tracking-wide ml-2">
              Why This Matters
            </Text>
          </View>
          <Text className="text-neutral-300 text-sm leading-6">
            {feedback.whyItMatters}
          </Text>
        </Animated.View>

        {/* Recommended Drill */}
        <Animated.View
          entering={FadeInUp.delay(550).duration(400)}
          className="bg-green-500/10 rounded-xl p-4 border border-green-500/30"
        >
          <View className="flex-row items-center mb-3">
            <View className="w-7 h-7 rounded-full bg-green-500 items-center justify-center mr-2">
              <Ionicons name="basketball" size={14} color="white" />
            </View>
            <Text className="text-green-500 text-sm font-bold uppercase tracking-wide">
              Practice This
            </Text>
          </View>
          <Text className="text-white text-sm leading-6">
            {feedback.drillRecommendation}
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
