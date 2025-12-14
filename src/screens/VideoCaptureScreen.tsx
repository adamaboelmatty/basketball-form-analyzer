import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";

import useCoachingStore from "../state/coachingStore";
import useUserStore, { getValidIdToken } from "../state/userStore";
import { runAnalysis, getErrorMessage } from "../api/analysis-service";
import { RootStackParamList } from "../navigation/RootNavigator";
import { CoachingSession, CorrectionCategory } from "../types/coaching";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function VideoCaptureScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);

  const addSession = useCoachingStore((s) => s.addSession);
  const setCurrentFocus = useCoachingStore((s) => s.setCurrentFocus);
  const incrementFocusSessions = useCoachingStore((s) => s.incrementFocusSessions);
  const currentFocus = useCoachingStore((s) => s.currentFocus);
  const canAnalyze = useCoachingStore((s) => s.canAnalyze);
  const isPro = useCoachingStore((s) => s.isPro);

  const user = useUserStore((s) => s.user);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Check entitlements on mount
  useEffect(() => {
    checkEntitlements();
  }, []);

  const checkEntitlements = async () => {
    // Check if user can analyze
    if (!canAnalyze()) {
      Alert.alert(
        "Upgrade to Pro",
        "You've used your free analyses. Upgrade to Pro for unlimited access.",
        [
          { text: "Not Now", onPress: () => navigation.goBack() },
          { text: "Upgrade", onPress: () => navigation.navigate("Paywall") },
        ]
      );
    }
  };

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const toggleCamera = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsCameraReady(false); // Reset camera ready state when switching
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  const onCameraReady = () => {
    setIsCameraReady(true);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !isCameraReady) {
      // Camera not ready yet
      return;
    }

    // Check entitlements before capture
    if (!canAnalyze()) {
      navigation.navigate("Paywall");
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (!isRecording) {
      // Start recording
      setIsRecording(true);
      try {
        const video = await cameraRef.current.recordAsync({
          maxDuration: 30, // 30 second max
        });

        if (video?.uri) {
          setCapturedUri(video.uri);
          await processAnalysis(video.uri);
        }
      } catch (error) {
        console.error("Recording error:", error);
        Alert.alert("Recording Failed", "Please try again");
        setIsRecording(false);
      }
    } else {
      // Stop recording
      setIsRecording(false);
      await cameraRef.current.stopRecording();
    }
  };

  const handlePickVideo = async () => {
    // Check entitlements before picking
    if (!canAnalyze()) {
      navigation.navigate("Paywall");
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setCapturedUri(result.assets[0].uri);
      await processAnalysis(result.assets[0].uri);
    }
  };

  const processAnalysis = async (uri: string) => {
    const sessionId = uuidv4();

    // Navigate to analyzing screen immediately with the video
    navigation.replace("Analyzing", { videoUri: uri, sessionId });

    // Continue processing in background
    try {
      // Get auth token for authenticated requests
      const token = await getValidIdToken();

      // Use backend API with full MediaPipe + Gemini 2.5 Flash pipeline
      const result = await runAnalysis({
        videoUri: uri,
        angleHint: "side",
        token,
        onProgress: () => {}, // No need for progress since we're on analyzing screen
      });

      const feedback = {
        coachSummary: result.coachSummary,
        primaryFocus: result.primaryFocus,
        whyItMatters: result.whyItMatters,
        drillRecommendation: result.drillRecommendation,
        correctionCategory: result.correctionCategory as CorrectionCategory,
      };

      const newSession: CoachingSession = {
        id: sessionId,
        date: new Date().toISOString(),
        videoUri: uri,
        feedback,
        // Include MediaPipe results (skeleton frames and angle measurements)
        skeletonFrameUrls: result.skeletonFrameUrls || [],
        shootingAngles: result.shootingAngles || undefined,
      };

      addSession(newSession);

      // Update focus tracking
      if (currentFocus === feedback.correctionCategory) {
        incrementFocusSessions();
      } else {
        setCurrentFocus(feedback.correctionCategory);
      }

      // Analysis will complete - AnalyzingScreen polls for session and navigates to CoachFeedback
    } catch (error) {
      console.error("Analysis error:", error);

      // Check if this is a paywall error
      const apiError = error as Error & { code?: string };
      if (apiError.code === "PAYWALL_REQUIRED") {
        Alert.alert(
          "Upgrade to Pro",
          "You've used your free analysis. Upgrade to Pro for unlimited access.",
          [
            { text: "Not Now", onPress: () => navigation.replace("MainTabs") },
            { text: "Upgrade", onPress: () => navigation.replace("Paywall") },
          ]
        );
        return;
      }

      const errorMessage = getErrorMessage(error);
      Alert.alert("Analysis Failed", errorMessage, [
        {
          text: "OK",
          onPress: () => navigation.replace("MainTabs"),
        },
      ]);
    }
  };

  // Permission denied state
  if (!permission?.granted) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center px-6">
        <Ionicons name="camera-outline" size={48} color="#737373" />
        <Text className="text-white text-lg font-semibold mt-4 text-center">
          Camera Access Required
        </Text>
        <Text className="text-neutral-400 text-sm mt-2 text-center">
          We need camera access to record your shooting clips
        </Text>
        <Pressable
          onPress={requestPermission}
          className="mt-6 bg-orange-500 px-6 py-3 rounded-xl active:opacity-70"
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </Pressable>
        <Pressable onPress={handleClose} className="mt-4 active:opacity-70">
          <Text className="text-neutral-400">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        mode="video"
        onCameraReady={onCameraReady}
      >
        {/* Overlay UI */}
        <View className="absolute top-0 left-0 right-0 bottom-0">
          {/* Top Bar */}
          <View
            className="flex-row items-center justify-between px-4"
            style={{ paddingTop: insets.top + 10 }}
          >
            <Pressable
              onPress={handleClose}
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center active:opacity-70"
            >
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>

            <Pressable
              onPress={toggleCamera}
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center active:opacity-70"
            >
              <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
            </Pressable>
          </View>

          {/* Guidance Text */}
          <Animated.View
            entering={FadeInUp.delay(300).duration(500)}
            className="flex-1 items-center justify-center"
          >
            <View className="bg-black/60 px-5 py-3 rounded-xl">
              <Text className="text-white text-center text-sm">
                Position yourself for a side or front angle
              </Text>
              <Text className="text-neutral-400 text-center text-xs mt-1">
                Full body visible • Natural shooting motion
              </Text>
            </View>
          </Animated.View>

          {/* Bottom Controls */}
          <View
            className="items-center pb-6"
            style={{ paddingBottom: insets.bottom + 20 }}
          >
            {/* Free analyses remaining indicator */}
            {!isPro && (
              <View className="bg-black/60 px-4 py-2 rounded-full mb-4">
                <Text className="text-neutral-300 text-xs">
                  {useCoachingStore.getState().getRemainingFreeAnalyses()} free {useCoachingStore.getState().getRemainingFreeAnalyses() === 1 ? "analysis" : "analyses"} remaining
                </Text>
              </View>
            )}

            <View className="flex-row items-center gap-8">
              {/* Gallery Button - Videos */}
              <Pressable
                onPress={handlePickVideo}
                className="w-12 h-12 rounded-xl bg-black/50 items-center justify-center active:opacity-70"
              >
                <Ionicons name="videocam-outline" size={24} color="#fff" />
              </Pressable>

              {/* Capture Button */}
              <Pressable
                onPress={handleCapture}
                disabled={!isCameraReady}
                className="active:scale-95"
                style={{ opacity: isCameraReady ? 1 : 0.5 }}
              >
                <View className="w-20 h-20 rounded-full border-4 border-white items-center justify-center">
                  <View
                    className={`w-16 h-16 ${
                      isRecording ? "bg-red-500 rounded-lg" : "bg-white rounded-full"
                    }`}
                  />
                </View>
              </Pressable>

              {/* Spacer */}
              <View className="w-12 h-12" />
            </View>

            <Text className="text-neutral-400 text-xs mt-4">
              {!isCameraReady
                ? "Camera loading..."
                : isRecording
                ? "Tap to stop recording"
                : "Tap to start recording"}
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}
