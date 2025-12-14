import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing, runOnJS } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import useCoachingStore from "../state/coachingStore";
import { CORRECTION_LABELS, CorrectionCategory } from "../types/coaching";
import { RootStackParamList } from "../navigation/RootNavigator";
import FormAnalysisOverlay from "../components/FormAnalysisOverlay";
import SkeletonCarousel from "../components/SkeletonCarousel";
import AngleMeasurements from "../components/AngleMeasurements";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "CoachFeedback">;

// Animated Score Component
function AnimatedScore({ targetScore }: { targetScore: number }) {
  const [displayScore, setDisplayScore] = useState(0);
  const scale = useSharedValue(0.8);
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    // Spring scale animation for bounce effect
    scale.value = withSpring(1, {
      damping: 8,
      stiffness: 100,
    });

    // Animate the counter from 0 to target
    animatedValue.value = withTiming(
      targetScore,
      {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      },
      () => {
        runOnJS(setDisplayScore)(Math.round(animatedValue.value));
      }
    );

    // Update the display value during animation
    const interval = setInterval(() => {
      setDisplayScore(Math.round(animatedValue.value));
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [targetScore]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text className="text-white text-5xl font-bold">{displayScore}</Text>
    </Animated.View>
  );
}

export default function CoachFeedbackScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const { sessionId } = route.params;
  const getSessionById = useCoachingStore((s) => s.getSessionById);
  const session = getSessionById(sessionId);

  const handleSave = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("MainTabs");
  };

  if (!session) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center">
        <Text className="text-neutral-400">Session not found</Text>
      </View>
    );
  }

  const { feedback } = session;

  // Calculate form score based on correction category (higher priority = lower score)
  const getFormScore = (): number => {
    const categoryScores: Record<string, number> = {
      balance_verticality: 75,      // Most fundamental issue
      shot_line_integrity: 82,      // Important alignment
      set_point_consistency: 88,    // Refinement
      release_follow_through: 92,   // Fine-tuning
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

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
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
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)} className="mb-6">
          <Text className="text-white text-2xl font-bold text-center mb-2">
            Analysis Complete
          </Text>
          <Text className="text-neutral-400 text-sm text-center">
            Here's what to focus on
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
              Your Primary Focus
            </Text>
          </View>
          <Text className="text-white text-lg font-bold leading-7 mb-1">
            {feedback.primaryFocus}
          </Text>
          <Text className="text-orange-200 text-xs mt-2">
            Master this first for the biggest improvement
          </Text>
        </Animated.View>

        {/* Skeleton Frames Carousel - Show if available */}
        {session.skeletonFrameUrls && session.skeletonFrameUrls.length > 0 && (
          <Animated.View entering={FadeInUp.delay(300).duration(400)} className="mb-5">
            <SkeletonCarousel frames={session.skeletonFrameUrls} />
          </Animated.View>
        )}

        {/* Angle Measurements - Show if available */}
        {session.shootingAngles && (
          <Animated.View entering={FadeInUp.delay(350).duration(400)} className="mb-5">
            <AngleMeasurements angles={session.shootingAngles} />
          </Animated.View>
        )}

        {/* Video with Analysis Overlay (fallback if no skeleton frames) */}
        {(!session.skeletonFrameUrls || session.skeletonFrameUrls.length === 0) && (
          <Animated.View entering={FadeInUp.delay(350).duration(400)} className="mb-5">
            <View className="flex-row items-start mb-4">
              {/* Annotated Video - Shows visual focus areas */}
              <View className="mr-4" style={{ width: 100 }}>
                <FormAnalysisOverlay
                  videoUri={session.videoUri}
                  correctionCategory={feedback.correctionCategory as CorrectionCategory}
                  isPlaying={true}
                  showAnnotations={true}
                />
              </View>

              {/* Score Display */}
              <View className="flex-1 justify-center">
                <View className="items-center">
                  {/* Score Circle with Animation */}
                  <View className="relative items-center justify-center mb-2">
                    <View 
                      className="items-center justify-center rounded-full border-3 border-green-500"
                      style={{ width: 85, height: 85 }}
                    >
                      <AnimatedScore targetScore={formScore} />
                    </View>
                  </View>
                  <Text className="text-green-400 text-base font-bold mb-1">
                    {getRating(formScore)}
                  </Text>
                  <Text className="text-neutral-500 text-xs">
                    Mechanics Score
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Quick Summary */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)} className="mb-5">
          <View className="bg-neutral-900/50 rounded-xl p-3 border border-neutral-800">
            <Text className="text-neutral-300 text-sm leading-5">
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

      {/* Save Button */}
      <View
        className="absolute left-0 right-0 px-5"
        style={{ bottom: insets.bottom + 20 }}
      >
        <Animated.View entering={FadeInUp.delay(650).duration(500)}>
          <Pressable
            onPress={handleSave}
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
              }}
            >
              <Text className="text-white text-lg font-semibold">
                Save & Practice
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
