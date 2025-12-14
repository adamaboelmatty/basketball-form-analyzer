import React, { useState, useEffect, useRef } from "react";
import { View, Text, Dimensions, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  SlideInDown,
  SlideOutUp,
} from "react-native-reanimated";

import { RootStackParamList } from "../navigation/RootNavigator";
import useCoachingStore from "../state/coachingStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type AnalyzingScreenRouteProp = RouteProp<RootStackParamList, "Analyzing">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface AnalysisTask {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: "pending" | "processing" | "complete";
}

// All the micro-tasks to cycle through
const ALL_TASKS: Omit<AnalysisTask, "status">[] = [
  { id: "upload", label: "Uploading video", icon: "cloud-upload-outline" },
  { id: "verify", label: "Verifying file integrity", icon: "shield-checkmark-outline" },
  { id: "compress", label: "Optimizing video quality", icon: "resize-outline" },
  { id: "frames", label: "Extracting key frames", icon: "film-outline" },
  { id: "detect-player", label: "Detecting player position", icon: "person-outline" },
  { id: "track-ball", label: "Tracking ball trajectory", icon: "basketball-outline" },
  { id: "release", label: "Analyzing release point", icon: "hand-right-outline" },
  { id: "arc", label: "Measuring arc angle", icon: "analytics-outline" },
  { id: "follow-through", label: "Calculating follow-through", icon: "trending-up-outline" },
  { id: "wrist", label: "Detecting wrist snap", icon: "finger-print-outline" },
  { id: "elbow", label: "Analyzing elbow alignment", icon: "git-branch-outline" },
  { id: "stance", label: "Evaluating stance width", icon: "footsteps-outline" },
  { id: "knee", label: "Checking knee bend", icon: "fitness-outline" },
  { id: "balance", label: "Measuring body balance", icon: "scale-outline" },
  { id: "rotation", label: "Analyzing hip rotation", icon: "sync-outline" },
  { id: "timing", label: "Calculating shot timing", icon: "timer-outline" },
  { id: "compare", label: "Comparing to pro mechanics", icon: "stats-chart-outline" },
  { id: "patterns", label: "Identifying form patterns", icon: "grid-outline" },
  { id: "ai-process", label: "Processing with AI model", icon: "hardware-chip-outline" },
  { id: "tips", label: "Generating personalized tips", icon: "bulb-outline" },
  { id: "drills", label: "Selecting practice drills", icon: "list-outline" },
  { id: "coach", label: "Preparing coach feedback", icon: "chatbubble-ellipses-outline" },
];

// Spinning loader component
function SpinningLoader() {
  return (
    <View className="w-5 h-5">
      <ActivityIndicator size="small" color="#f97316" />
    </View>
  );
}

// Number of visible tasks at once
const VISIBLE_TASKS = 5;

export default function AnalyzingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AnalyzingScreenRouteProp>();
  const { videoUri, sessionId } = route.params;
  const insets = useSafeAreaInsets();
  const videoRef = useRef<Video>(null);

  const [completedCount, setCompletedCount] = useState(0);
  const [visualComplete, setVisualComplete] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const hasNavigated = useRef(false);

  // Get session from store
  const getSessionById = useCoachingStore((s) => s.getSessionById);

  // Scanning line animation
  const scanY = useSharedValue(0);

  // Get visible tasks based on current progress
  const getVisibleTasks = (): AnalysisTask[] => {
    const tasks: AnalysisTask[] = [];
    
    // Calculate which tasks to show (sliding window)
    const startIdx = Math.max(0, completedCount - 1); // Show 1 completed task at top if available
    const endIdx = Math.min(ALL_TASKS.length, startIdx + VISIBLE_TASKS);
    
    for (let i = startIdx; i < endIdx; i++) {
      const task = ALL_TASKS[i];
      let status: AnalysisTask["status"] = "pending";
      
      if (i < completedCount) {
        status = "complete";
      } else if (i === completedCount) {
        status = "processing";
      }
      
      tasks.push({ ...task, status });
    }
    
    return tasks;
  };

  // Navigate when both visual animation and session are ready
  useEffect(() => {
    if (visualComplete && sessionReady && !hasNavigated.current) {
      hasNavigated.current = true;
      navigation.replace("CoachFeedback", { sessionId });
    }
  }, [visualComplete, sessionReady, sessionId, navigation]);

  // Poll for session readiness
  useEffect(() => {
    const pollInterval = setInterval(() => {
      const session = getSessionById(sessionId);
      if (session) {
        setSessionReady(true);
        clearInterval(pollInterval);
      }
    }, 500); // Check every 500ms

    // Timeout after 90 seconds - analysis failed
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (!sessionReady && !hasNavigated.current) {
        hasNavigated.current = true;
        Alert.alert(
          "Analysis Timeout",
          "The analysis is taking longer than expected. Please try again.",
          [
            {
              text: "OK",
              onPress: () => navigation.replace("MainTabs"),
            },
          ]
        );
      }
    }, 90000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [sessionId, getSessionById, sessionReady, navigation]);

  // Visual animation
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

    // Play video at 2.5x speed
    if (videoRef.current) {
      videoRef.current.setRateAsync(2.5, true);
    }

    // Progress through tasks - cycle through all, then loop last few while waiting
    const taskInterval = setInterval(() => {
      setCompletedCount((prev) => {
        const next = prev + 1;

        if (next >= ALL_TASKS.length) {
          clearInterval(taskInterval);
          // Mark visual animation as complete
          setVisualComplete(true);
          return prev;
        }

        return next;
      });
    }, 700); // 700ms per task

    return () => {
      clearInterval(taskInterval);
    };
  }, []);

  const scanAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value * 360 }], // Adjusted for smaller video height
  }));

  const visibleTasks = getVisibleTasks();

  return (
    <View className="flex-1 bg-neutral-950">
      <LinearGradient
        colors={["#171717", "#0a0a0a"]}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View 
          className="items-center"
          style={{ marginTop: insets.top + 16 }}
        >
          <Text className="text-white text-2xl font-bold">Analyzing Your Shot</Text>
          <Text className="text-neutral-400 text-sm mt-1">
            Our AI is analyzing your form and mechanics
          </Text>
        </View>

        {/* Video Preview - Tighter */}
        <View
          className="overflow-hidden self-center"
          style={{
            marginTop: 20,
            width: SCREEN_WIDTH - 120, // Much tighter - 60px margin on each side
            height: 380,
            borderRadius: 20,
          }}
        >
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay
            isMuted
          />

          {/* Scanning overlay */}
          <View className="absolute inset-0 bg-black/20">
            {/* Grid overlay for tech feel */}
            <View className="absolute inset-0">
              {[...Array(10)].map((_, i) => (
                <View
                  key={`h-${i}`}
                  className="absolute left-0 right-0 h-px bg-orange-500/10"
                  style={{ top: `${i * 10}%` }}
                />
              ))}
              {[...Array(10)].map((_, i) => (
                <View
                  key={`v-${i}`}
                  className="absolute top-0 bottom-0 w-px bg-orange-500/10"
                  style={{ left: `${i * 10}%` }}
                />
              ))}
            </View>

            {/* Animated scanning line */}
            <Animated.View
              style={[
                {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  height: 3,
                },
                scanAnimatedStyle,
              ]}
            >
              <LinearGradient
                colors={[
                  "transparent",
                  "rgba(249, 115, 22, 0.8)",
                  "rgba(249, 115, 22, 0.8)",
                  "transparent",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: "100%", width: "100%" }}
              />
            </Animated.View>

            {/* Corner brackets */}
            <View className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-orange-500" />
            <View className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-orange-500" />
            <View className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-orange-500" />
            <View className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-orange-500" />

            {/* Analyzing badge */}
            <View className="absolute top-4 left-0 right-0 items-center">
              <View className="bg-black/70 rounded-full px-4 py-2 flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
                <Text className="text-orange-500 text-xs font-semibold uppercase tracking-wide">
                  Analyzing
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Analysis Tasks */}
        <View className="px-6 mt-6">
          {/* Progress indicator */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
              <Text className="text-neutral-400 text-sm">
                Processing step {completedCount + 1} of {ALL_TASKS.length}
              </Text>
            </View>
            <Text className="text-orange-500 text-sm font-medium">
              {Math.round(((completedCount + 1) / ALL_TASKS.length) * 100)}%
            </Text>
          </View>

          {/* Progress bar */}
          <View className="h-1 bg-neutral-800 rounded-full mb-5 overflow-hidden">
            <Animated.View 
              className="h-full bg-orange-500 rounded-full"
              style={{ 
                width: `${((completedCount + 1) / ALL_TASKS.length) * 100}%` 
              }}
            />
          </View>

          {/* Task List - Scrolling effect */}
          <View className="overflow-hidden" style={{ height: VISIBLE_TASKS * 44 }}>
            {visibleTasks.map((task, index) => {
              const isProcessing = task.status === "processing";
              const isComplete = task.status === "complete";

              return (
                <Animated.View
                  key={`${task.id}-${completedCount}`}
                  entering={SlideInDown.duration(300)}
                  exiting={SlideOutUp.duration(300)}
                  className="flex-row items-center py-2"
                >
                  {/* Status Icon */}
                  <View
                    className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                      isComplete
                        ? "bg-green-500/20"
                        : isProcessing
                        ? "bg-orange-500/20"
                        : "bg-neutral-800/50"
                    }`}
                  >
                    {isComplete ? (
                      <Ionicons name="checkmark" size={16} color="#22c55e" />
                    ) : (
                      <Ionicons
                        name={task.icon}
                        size={16}
                        color={isProcessing ? "#f97316" : "#525252"}
                      />
                    )}
                  </View>

                  {/* Task Label */}
                  <View className="flex-1">
                    <Text
                      className={`text-sm ${
                        isComplete
                          ? "text-green-400/80"
                          : isProcessing
                          ? "text-white font-medium"
                          : "text-neutral-600"
                      }`}
                    >
                      {task.label}
                    </Text>
                  </View>

                  {/* Processing Spinner */}
                  {isProcessing && <SpinningLoader />}
                  
                  {/* Checkmark for completed */}
                  {isComplete && (
                    <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                  )}
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Bottom Note */}
        <View
          className="absolute bottom-0 left-0 right-0 px-6"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="bg-neutral-900/50 rounded-xl p-3">
            <Text className="text-neutral-500 text-xs text-center leading-5">
              Our AI coach is analyzing every detail of your shot
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
