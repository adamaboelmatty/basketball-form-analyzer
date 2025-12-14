import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Dimensions, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withSpring, Easing, interpolate, useAnimatedProps, runOnJS } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Video, ResizeMode } from "expo-av";

import useOnboardingStore from "../state/onboardingStore";
import useCoachingStore from "../state/coachingStore";
import { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get("window");

// Goal options for commitment screen
const GOAL_OPTIONS = [
  { id: "consistency", label: "Shooting consistency" },
  { id: "confidence", label: "Confidence in my shot" },
  { id: "focus", label: "Knowing what to focus on" },
  { id: "simplicity", label: "Getting better without overthinking" },
];

// Sample feedback for WOW moment
const SAMPLE_FEEDBACK = {
  coachSummary: "Your base is shifting forward during the shot, causing inconsistent release points.",
  primaryFocus: "Focus on keeping your weight centered over your feet through the entire shooting motion.",
  whyItMatters: "A stable base creates a repeatable release point, which leads to more consistent shots.",
  drillRecommendation: "Practice form shots from 5 feet, pausing at your set point to check your balance before releasing.",
};

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
        // Update display on each frame
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

// Trimmed micro-tasks for demo (readable pace)
const DEMO_TASKS = [
  { id: "upload", label: "Uploading video", icon: "cloud-upload-outline" as const },
  { id: "frames", label: "Extracting key frames", icon: "film-outline" as const },
  { id: "detect-player", label: "Detecting player position", icon: "person-outline" as const },
  { id: "track-ball", label: "Tracking ball trajectory", icon: "basketball-outline" as const },
  { id: "release", label: "Analyzing release point", icon: "hand-right-outline" as const },
  { id: "form", label: "Evaluating shooting form", icon: "body-outline" as const },
  { id: "compare", label: "Comparing to pro mechanics", icon: "stats-chart-outline" as const },
  { id: "ai-process", label: "Processing with AI", icon: "hardware-chip-outline" as const },
  { id: "tips", label: "Generating personalized tips", icon: "bulb-outline" as const },
  { id: "coach", label: "Preparing coach feedback", icon: "chatbubble-ellipses-outline" as const },
];

const DEMO_VISIBLE_TASKS = 6;

// Demo Analyzing View Component (mimics AnalyzingScreen)
function DemoAnalyzingView() {
  const insets = useSafeAreaInsets();
  const [completedCount, setCompletedCount] = useState(0);

  // Scanning line animation
  const scanY = useSharedValue(0);

  // Get visible tasks based on current progress (sliding window)
  const getVisibleTasks = () => {
    const tasks: Array<{ id: string; label: string; icon: keyof typeof Ionicons.glyphMap; status: "pending" | "processing" | "complete" }> = [];
    
    const startIdx = Math.max(0, completedCount - 1);
    const endIdx = Math.min(DEMO_TASKS.length, startIdx + DEMO_VISIBLE_TASKS);
    
    for (let i = startIdx; i < endIdx; i++) {
      const task = DEMO_TASKS[i];
      let status: "pending" | "processing" | "complete" = "pending";
      
      if (i < completedCount) {
        status = "complete";
      } else if (i === completedCount) {
        status = "processing";
      }
      
      tasks.push({ ...task, status });
    }
    
    return tasks;
  };

  useEffect(() => {
    // Start scanning animation
    scanY.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Progress through tasks at readable pace (~700ms per task = 7 seconds total)
    const taskInterval = setInterval(() => {
      setCompletedCount((prev) => {
        if (prev >= DEMO_TASKS.length - 1) {
          clearInterval(taskInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 700);

    return () => clearInterval(taskInterval);
  }, []);

  const scanAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value * 260 }],
  }));

  const visibleTasks = getVisibleTasks();

  return (
    <View className="flex-1 bg-neutral-950">
      <LinearGradient colors={["#171717", "#0a0a0a"]} style={{ flex: 1 }}>
        {/* Header */}
        <View className="px-6 items-center" style={{ marginTop: insets.top + 10 }}>
          <Text className="text-white text-2xl font-bold text-center mb-1">
            Analyzing Your Shot
          </Text>
          <Text className="text-neutral-400 text-sm text-center">
            Our AI is analyzing your form and mechanics
          </Text>
        </View>

        {/* Video Preview - Tighter */}
        <View
          className="overflow-hidden bg-neutral-900 self-center"
          style={{
            marginTop: 16,
            width: width - 120,
            height: 280,
            borderRadius: 20,
          }}
        >
          {/* Actual Demo Video */}
          <Video
            source={require("../../assets/demo-shot.mp4")}
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

          {/* Scanning overlay */}
          <View className="absolute inset-0" pointerEvents="none">
            <Animated.View
              style={[
                scanAnimatedStyle,
                {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  height: 2,
                  backgroundColor: "#f97316",
                  shadowColor: "#f97316",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 10,
                },
              ]}
            />
          </View>

          {/* Corner brackets */}
          <View className="absolute top-3 left-3" pointerEvents="none">
            <View className="w-6 h-6 border-l-2 border-t-2 border-orange-500/60" />
          </View>
          <View className="absolute top-3 right-3" pointerEvents="none">
            <View className="w-6 h-6 border-r-2 border-t-2 border-orange-500/60" />
          </View>
          <View className="absolute bottom-3 left-3" pointerEvents="none">
            <View className="w-6 h-6 border-l-2 border-b-2 border-orange-500/60" />
          </View>
          <View className="absolute bottom-3 right-3" pointerEvents="none">
            <View className="w-6 h-6 border-r-2 border-b-2 border-orange-500/60" />
          </View>

          {/* Analyzing badge */}
          <View className="absolute top-3 left-0 right-0 items-center" pointerEvents="none">
            <View className="bg-black/70 rounded-full px-3 py-1.5 flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2" />
              <Text className="text-orange-500 text-xs font-semibold uppercase tracking-wide">
                Analyzing
              </Text>
            </View>
          </View>
        </View>

        {/* Task Progress */}
        <View className="mt-8 px-6">
          {/* Progress indicator */}
          <View className="flex-row items-center justify-center mb-3">
            <View className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
            <Text className="text-neutral-400 text-sm">
              Processing step {completedCount + 1} of {DEMO_TASKS.length}
            </Text>
            <Text className="text-orange-500 text-sm font-medium ml-3">
              {Math.round(((completedCount + 1) / DEMO_TASKS.length) * 100)}%
            </Text>
          </View>

          {/* Progress bar */}
          <View className="h-1 bg-neutral-800 rounded-full mb-8 overflow-hidden">
            <View 
              className="h-full bg-orange-500 rounded-full"
              style={{ 
                width: `${((completedCount + 1) / DEMO_TASKS.length) * 100}%` 
              }}
            />
          </View>

          {/* Task List - Centered, scrolling effect */}
          <View className="items-center" style={{ height: DEMO_VISIBLE_TASKS * 52 }}>
            {visibleTasks.map((task) => {
              const isComplete = task.status === "complete";
              const isProcessing = task.status === "processing";

              return (
                <Animated.View
                  key={`${task.id}-${completedCount}`}
                  entering={FadeInUp.duration(200)}
                  className="flex-row items-center justify-center py-3"
                >
                  {/* Icon */}
                  <View
                    className={`w-7 h-7 rounded-full items-center justify-center mr-3 ${
                      isComplete
                        ? "bg-green-500/20"
                        : isProcessing
                        ? "bg-orange-500/20"
                        : "bg-neutral-800/50"
                    }`}
                  >
                    {isComplete ? (
                      <Ionicons name="checkmark" size={14} color="#22c55e" />
                    ) : isProcessing ? (
                      <ActivityIndicator size="small" color="#f97316" />
                    ) : (
                      <Ionicons name={task.icon} size={14} color="#525252" />
                    )}
                  </View>

                  {/* Label */}
                  <Text
                    className={`text-sm ${
                      isComplete
                        ? "text-green-400/80"
                        : isProcessing
                        ? "text-white font-medium"
                        : "text-neutral-600"
                    }`}
                    style={{ width: 200 }}
                  >
                    {task.label}
                  </Text>

                  {/* Status indicator */}
                  <View className="w-5 ml-2">
                    {isComplete && (
                      <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                    )}
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [currentScreen, setCurrentScreen] = useState(0);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [demoStep, setDemoStep] = useState<"idle" | "analyzing" | "result">("idle");

  const setGoals = useOnboardingStore((s) => s.setGoals);
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const hasCreatedAccount = useOnboardingStore((s) => s.hasCreatedAccount);
  const sessions = useCoachingStore((s) => s.sessions);

  // Skip only if onboarding is complete AND account is created
  useEffect(() => {
    if ((hasCompletedOnboarding && hasCreatedAccount) || sessions.length > 0) {
      navigation.replace("MainTabs");
    }
  }, [hasCompletedOnboarding, hasCreatedAccount, sessions.length, navigation]);

  // Handle demo flow timing
  useEffect(() => {
    if (demoStep === "analyzing") {
      // After 7.5 seconds (time for tasks to complete), show result
      const timer = setTimeout(() => {
        setDemoStep("result");
      }, 7500);
      return () => clearTimeout(timer);
    }
  }, [demoStep]);

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentScreen < 5) {
      setCurrentScreen(currentScreen + 1);
    } else {
      // Screen 6 (index 5) -> Go to Paywall
      setGoals(selectedGoals);
      navigation.navigate("Paywall", { fromOnboarding: true });
    }
  };

  const handleGoalToggle = async (goalId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedGoals((prev) => {
      if (prev.includes(goalId)) {
        return prev.filter((id) => id !== goalId);
      }
      if (prev.length < 2) {
        return [...prev, goalId];
      }
      return prev;
    });
  };

  const handleStartDemo = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDemoStep("analyzing");
  };

  const handleDemoComplete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDemoStep("idle");
    setCurrentScreen(currentScreen + 1);
  };

  const handleSkipToApp = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoals(selectedGoals);
    completeOnboarding();
    navigation.replace("MainTabs");
  };

  // Screen 1: Authority + Unity
  const renderScreen1 = () => (
    <Animated.View
      key="screen1"
      entering={FadeIn.duration(400)}
      className="flex-1 justify-center items-center px-8"
    >
      <View className="w-32 h-32 rounded-full bg-neutral-800 items-center justify-center mb-8">
        <Ionicons name="basketball" size={56} color="#f97316" />
      </View>

      <Text className="text-white text-3xl font-bold text-center leading-tight mb-4">
        Coach-backed{"\n"}shooting guidance.
      </Text>

      <Text className="text-neutral-400 text-base text-center leading-6">
        Built with real college coaches to help players work on the right thing.
      </Text>
    </Animated.View>
  );

  // Screen 2: Problem Framing + Liking
  const renderScreen2 = () => (
    <Animated.View
      key="screen2"
      entering={FadeIn.duration(400)}
      className="flex-1 justify-center items-center px-8"
    >
      <View className="w-20 h-20 rounded-full bg-neutral-800 items-center justify-center mb-8">
        <Ionicons name="help-circle-outline" size={40} color="#737373" />
      </View>

      <Text className="text-white text-3xl font-bold text-center leading-tight mb-4">
        Most players practice the wrong thing.
      </Text>

      <Text className="text-neutral-400 text-base text-center leading-6 mb-4">
        {"You don't need more drills. You need to know what your coach would fix first."}
      </Text>

      <Text className="text-neutral-500 text-sm text-center">
        {"That's what this app does."}
      </Text>
    </Animated.View>
  );

  // Screen 3: Commitment (Micro-Choice)
  const renderScreen3 = () => (
    <Animated.View
      key="screen3"
      entering={FadeIn.duration(400)}
      className="flex-1 justify-center px-6"
    >
      <Text className="text-white text-2xl font-bold text-center mb-2">
        What are you here to work on?
      </Text>
      <Text className="text-neutral-500 text-sm text-center mb-8">
        Select 1-2 that apply
      </Text>

      <View className="gap-3">
        {GOAL_OPTIONS.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
          return (
            <Pressable
              key={goal.id}
              onPress={() => handleGoalToggle(goal.id)}
              className={`p-4 rounded-xl border ${
                isSelected
                  ? "bg-orange-500/10 border-orange-500/50"
                  : "bg-neutral-900 border-neutral-800"
              } active:opacity-80`}
            >
              <View className="flex-row items-center justify-between">
                <Text
                  className={`text-base ${
                    isSelected ? "text-white font-medium" : "text-neutral-300"
                  }`}
                >
                  {goal.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color="#f97316" />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );

  // Screen 4: Reciprocity + Interesting Fact
  const renderScreen4 = () => (
    <Animated.View
      key="screen4"
      entering={FadeIn.duration(400)}
      className="flex-1 justify-center items-center px-8"
    >
      <View className="w-20 h-20 rounded-full bg-orange-500/10 items-center justify-center mb-8">
        <Ionicons name="bulb" size={36} color="#f97316" />
      </View>

      <Text className="text-neutral-400 text-sm uppercase tracking-wide mb-3">
        One thing most coaches agree on
      </Text>

      <Text className="text-white text-2xl font-bold text-center leading-tight mb-4">
        Trying to fix multiple things at once slows improvement.
      </Text>

      <Text className="text-neutral-400 text-base text-center leading-6 mb-4">
        The fastest progress comes from fixing one thing at a time.
      </Text>

      <Text className="text-neutral-500 text-sm text-center">
        {"That's how this app works."}
      </Text>
    </Animated.View>
  );

  // Screen 5: Demo Flow (Analyzing -> Result)
  const renderScreen5 = () => {
    // Demo Analyzing State (Full AnalyzingScreen experience)
    if (demoStep === "analyzing") {
      return <DemoAnalyzingView />;
    }

    // Demo Result State (WOW Moment)
    if (demoStep === "result") {
      return (
        <Animated.View
          key="demo-result"
          entering={FadeIn.duration(400)}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{
              paddingTop: insets.top + 20,
              paddingBottom: 20,
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
                {SAMPLE_FEEDBACK.primaryFocus}
              </Text>
              <Text className="text-orange-200 text-xs mt-2">
                Master this first for the biggest improvement
              </Text>
            </Animated.View>

            {/* Video, Score, and Summary Row */}
            <Animated.View entering={FadeInUp.delay(350).duration(400)} className="mb-5">
              <View className="flex-row items-start mb-4">
                {/* Video Thumbnail */}
                <View className="mr-4">
                  <View 
                    className="rounded-xl overflow-hidden bg-neutral-900"
                    style={{ width: 80, height: 140 }}
                  >
                    <Video
                      source={require("../../assets/demo-shot.mp4")}
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
                  </View>
                </View>

                {/* Score Display - Smaller, Less Prominent */}
                <View className="flex-1 justify-center">
                  <View className="items-center">
                    {/* Score Circle with Animation */}
                    <View className="relative items-center justify-center mb-2">
                      <View 
                        className="items-center justify-center rounded-full border-3 border-green-500"
                        style={{ width: 85, height: 85 }}
                      >
                        <AnimatedScore targetScore={92} />
                      </View>
                    </View>
                    <Text className="text-green-400 text-base font-bold mb-1">
                      Excellent Form
                    </Text>
                    <Text className="text-neutral-500 text-xs">
                      Mechanics Score
                    </Text>
                  </View>
                </View>
              </View>

              {/* Quick Summary */}
              <View className="bg-neutral-900/50 rounded-xl p-3 border border-neutral-800">
                <Text className="text-neutral-300 text-sm leading-5">
                  Your shooting form shows strong fundamentals with consistent release point and good follow-through.
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
                {SAMPLE_FEEDBACK.whyItMatters}
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
                {SAMPLE_FEEDBACK.drillRecommendation}
              </Text>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      );
    }

    // Initial state - prompt to start demo
    return (
      <Animated.View
        key="demo-start"
        entering={FadeIn.duration(400)}
        className="flex-1 justify-center items-center px-8"
      >
        <View className="w-24 h-24 rounded-full bg-orange-500/10 items-center justify-center mb-8">
          <Ionicons name="play" size={44} color="#f97316" />
        </View>

        <Text className="text-white text-2xl font-bold text-center leading-tight mb-4">
          See how it works
        </Text>

        <Text className="text-neutral-400 text-base text-center leading-6 mb-2">
          Watch a quick demo of the analysis process.
        </Text>

        <Text className="text-neutral-500 text-sm text-center">
          Record → Analyze → Get your focus
        </Text>
      </Animated.View>
    );
  };

  // Screen 6: Scarcity + Transparency
  const renderScreen6 = () => (
    <Animated.View
      key="screen6"
      entering={FadeIn.duration(400)}
      className="flex-1 justify-center items-center px-8"
    >
      <View className="w-20 h-20 rounded-full bg-orange-500/10 items-center justify-center mb-8">
        <Text className="text-orange-500 text-3xl font-bold">2</Text>
      </View>

      <Text className="text-white text-2xl font-bold text-center leading-tight mb-4">
        Get started with 2 free shot analyses.
      </Text>

      <Text className="text-neutral-400 text-base text-center leading-6 mb-4">
        {"We give every player two full coach reviews so you can see if it's right for you."}
      </Text>

      <Text className="text-neutral-500 text-sm text-center italic">
        Most players choose to continue once they see the guidance.
      </Text>
    </Animated.View>
  );

  // Determine CTA text and action based on current state
  const getCtaConfig = () => {
    if (currentScreen === 4) {
      if (demoStep === "idle") {
        return { text: "See How It Works", action: handleStartDemo, disabled: false };
      }
      if (demoStep === "result") {
        return { text: "Continue", action: handleDemoComplete, disabled: false };
      }
      // During analyzing, hide button
      return { text: "", action: () => {}, disabled: true, hidden: true };
    }

    if (currentScreen === 2) {
      return { text: "Continue", action: handleNext, disabled: selectedGoals.length === 0 };
    }

    if (currentScreen === 5) {
      return { text: "Upload My First Clip", action: handleNext, disabled: false };
    }

    const ctaTexts = ["Get Started", "Show Me", "Continue", "Continue", "See How It Works", "Upload My First Clip"];
    return { text: ctaTexts[currentScreen], action: handleNext, disabled: false };
  };

  const ctaConfig = getCtaConfig();

  const screens = [
    renderScreen1,
    renderScreen2,
    renderScreen3,
    renderScreen4,
    renderScreen5,
    renderScreen6,
  ];

  // Calculate dot count (don't count demo sub-steps)
  const totalScreens = 6;

  return (
    <View className="flex-1 bg-neutral-950">
      <LinearGradient
        colors={["#171717", "#0a0a0a"]}
        style={{ flex: 1 }}
      >
        {/* Skip Button (screens 1-3 only, not during demo) */}
        {currentScreen < 4 && (
          <View
            className="flex-row justify-end px-5"
            style={{ paddingTop: insets.top + 10 }}
          >
            <Pressable
              onPress={handleSkipToApp}
              className="px-4 py-2 active:opacity-70"
            >
              <Text className="text-neutral-500 text-sm">Skip</Text>
            </Pressable>
          </View>
        )}

        {/* Screen Content */}
        {screens[currentScreen]()}

        {/* Bottom Section - completely hidden during analyzing demo */}
        {!(currentScreen === 4 && demoStep === "analyzing") && (
          <View
            className="px-6"
            style={{ paddingBottom: insets.bottom + 20 }}
          >
            {/* Progress Dots - hide during demo screen */}
            {currentScreen !== 4 && (
              <View className="flex-row justify-center mb-6">
                {Array.from({ length: totalScreens }).map((_, index) => (
                  <View
                    key={index}
                    className={`w-2 h-2 rounded-full mx-1 ${
                      index === currentScreen ? "bg-orange-500" : "bg-neutral-700"
                    }`}
                  />
                ))}
              </View>
            )}

            {/* CTA Button */}
            {!ctaConfig.hidden && (
              <Pressable
                onPress={ctaConfig.action}
                disabled={ctaConfig.disabled}
                className="active:scale-98"
                style={{ opacity: ctaConfig.disabled ? 0.5 : 1 }}
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
                    {ctaConfig.text}
                  </Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}
