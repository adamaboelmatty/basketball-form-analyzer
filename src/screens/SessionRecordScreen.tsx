import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  Easing,
} from "react-native-reanimated";

import { RootStackParamList } from "../navigation/RootNavigator";
import { RimCalibration } from "../types/session-analysis";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type SessionRecordRouteProp = RouteProp<RootStackParamList, "SessionRecord">;

export default function SessionRecordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SessionRecordRouteProp>();
  const [permission, requestPermission] = useCameraPermissions();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);

  // Animation for recording indicator
  const pulseOpacity = useSharedValue(1);

  // Parse calibration from route params
  const calibration: RimCalibration = JSON.parse(route.params.calibration);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, []);

  // Pulse animation for recording indicator
  useEffect(() => {
    if (isRecording) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isRecording) {
      await stopRecording();
    }
    navigation.goBack();
  };

  const onCameraReady = () => {
    setIsCameraReady(true);
  };

  const startRecording = async () => {
    if (!cameraRef.current || !isCameraReady) {
      Alert.alert("Camera Not Ready", "Please wait for the camera to initialize.");
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsRecording(true);
    setRecordingTime(0);

    // Start timer
    recordingTimer.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);

    // Start video recording
    try {
      recordingPromiseRef.current = cameraRef.current.recordAsync({
        maxDuration: 120, // Max 2 minutes for a session
      });
    } catch (error) {
      console.error("Failed to start recording:", error);
      setIsRecording(false);
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      Alert.alert("Recording Error", "Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
    }

    setIsRecording(false);

    // Stop camera recording
    if (cameraRef.current) {
      try {
        cameraRef.current.stopRecording();
        
        // Wait for the recording to complete and get the URI
        const video = await recordingPromiseRef.current;
        
        if (video?.uri) {
          // Generate session ID
          const sessionId = uuidv4();
          
          // Store the video URI and calibration for processing
          // In production, this would upload to backend and process
          console.log("Session recorded:", {
            sessionId,
            videoUri: video.uri,
            calibration,
            duration: recordingTime,
          });

          // Navigate to results screen
          navigation.replace("SessionResults", {
            sessionId,
          });
        } else {
          throw new Error("No video URI returned");
        }
      } catch (error) {
        console.error("Failed to stop recording:", error);
        Alert.alert(
          "Recording Error",
          "Failed to save the recording. Please try again.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      // Only allow stopping after at least 5 seconds
      if (recordingTime < 5) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  if (!permission?.granted) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center px-6">
        <Ionicons name="camera-outline" size={48} color="#737373" />
        <Text className="text-white text-lg font-semibold mt-4 text-center">
          Camera Access Required
        </Text>
        <Text className="text-neutral-400 text-sm mt-2 text-center">
          We need camera access to record your shooting session
        </Text>
        <Pressable
          onPress={requestPermission}
          className="mt-6 bg-orange-500 px-6 py-3 rounded-xl active:opacity-70"
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </Pressable>
        <Pressable onPress={handleBack} className="mt-4 active:opacity-70">
          <Text className="text-neutral-400">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Camera Preview */}
      <CameraView 
        ref={cameraRef} 
        style={{ flex: 1 }} 
        facing="back"
        mode="video"
        onCameraReady={onCameraReady}
      >
        {/* Overlay UI */}
        <View className="absolute top-0 left-0 right-0 bottom-0">
          {/* Header */}
          <View
            className="flex-row items-center justify-between px-5"
            style={{ paddingTop: insets.top + 10 }}
          >
            <Pressable
              onPress={handleBack}
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center active:opacity-70"
            >
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>

            {/* Recording indicator */}
            {isRecording && (
              <Animated.View 
                style={pulseStyle}
                className="flex-row items-center bg-black/60 rounded-full px-4 py-2"
              >
                <View className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                <Text className="text-white font-mono text-base">
                  {formatTime(recordingTime)}
                </Text>
              </Animated.View>
            )}

            <View className="w-10" />
          </View>

          {/* Calibration overlay hint */}
          <View
            className="absolute items-center justify-center"
            style={{
              left: calibration.rimCenterX - calibration.rimRadiusPx,
              top: calibration.rimCenterY - calibration.rimRadiusPx,
              width: calibration.rimRadiusPx * 2,
              height: calibration.rimRadiusPx * 2,
            }}
          >
            <View
              className="w-full h-full rounded-full border-2 border-dashed"
              style={{ borderColor: isRecording ? "rgba(249, 115, 22, 0.6)" : "rgba(249, 115, 22, 0.4)" }}
            />
          </View>

          {/* Instructions */}
          <View className="items-center mt-6 px-6">
            <View className="bg-black/60 rounded-2xl px-5 py-3">
              <Text className="text-white text-center text-base font-medium">
                {!isCameraReady
                  ? "Initializing camera..."
                  : isRecording
                  ? "Recording your session"
                  : "Ready to record"}
              </Text>
              <Text className="text-neutral-400 text-center text-sm mt-1">
                {!isCameraReady
                  ? "Please wait..."
                  : isRecording
                  ? "Shoot 5-10 free throws, then stop"
                  : `Angle: ${calibration.angle === "side" ? "Side view" : "Front view"}`}
              </Text>
            </View>
          </View>

          {/* Shot counter hint */}
          {isRecording && recordingTime >= 5 && (
            <View className="items-center mt-4">
              <View className="bg-green-500/20 rounded-full px-4 py-2">
                <Text className="text-green-400 text-sm">
                  Tap stop when finished shooting
                </Text>
              </View>
            </View>
          )}

          {/* Minimum time warning */}
          {isRecording && recordingTime < 5 && (
            <View className="items-center mt-4">
              <View className="bg-orange-500/20 rounded-full px-4 py-2">
                <Text className="text-orange-400 text-sm">
                  Minimum {5 - recordingTime}s more needed
                </Text>
              </View>
            </View>
          )}

          {/* Bottom Controls */}
          <View
            className="absolute bottom-0 left-0 right-0 items-center"
            style={{ paddingBottom: insets.bottom + 30 }}
          >
            {/* Record Button */}
            <Pressable
              onPress={handleToggleRecording}
              disabled={!isCameraReady}
              className="active:scale-95"
              style={{ opacity: isCameraReady ? 1 : 0.5 }}
            >
              <View
                className={`w-20 h-20 rounded-full items-center justify-center ${
                  isRecording ? "bg-red-500/20" : "bg-white/10"
                }`}
              >
                <View
                  className={`items-center justify-center ${
                    isRecording
                      ? "w-8 h-8 rounded-md bg-red-500"
                      : "w-16 h-16 rounded-full bg-red-500"
                  }`}
                />
              </View>
            </Pressable>

            <Text className="text-white/70 text-sm mt-4">
              {!isCameraReady
                ? "Camera loading..."
                : isRecording
                ? recordingTime < 5
                  ? `Recording... (${5 - recordingTime}s min)`
                  : "Tap to stop"
                : "Tap to start recording"}
            </Text>

            {/* Session tips */}
            {!isRecording && isCameraReady && (
              <View className="flex-row items-center mt-4 px-6">
                <View className="flex-row items-center bg-neutral-900/70 rounded-full px-4 py-2">
                  <Ionicons name="basketball-outline" size={16} color="#f97316" />
                  <Text className="text-neutral-400 text-xs ml-2">
                    5-10 shots • Same spot • Natural rhythm
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}
