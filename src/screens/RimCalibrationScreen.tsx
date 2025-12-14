import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/RootNavigator";
import { CameraAngle, RimCalibration } from "../types/session-analysis";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CIRCLE_SIZE = SCREEN_WIDTH * 0.35;

export default function RimCalibrationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [permission, requestPermission] = useCameraPermissions();

  const [selectedAngle, setSelectedAngle] = useState<CameraAngle>("side");
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const calibrationTimer = useRef<NodeJS.Timeout | null>(null);

  // Circle position (center of screen by default)
  const circleX = useSharedValue(SCREEN_WIDTH / 2);
  const circleY = useSharedValue(SCREEN_HEIGHT / 2 - 50);

  // Pulse animation for the circle
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    // Start pulse animation
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: circleX.value - CIRCLE_SIZE / 2 },
      { translateY: circleY.value - CIRCLE_SIZE / 2 },
      { scale: pulseScale.value },
    ],
  }));

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (calibrationTimer.current) {
      clearInterval(calibrationTimer.current);
    }
    navigation.goBack();
  };

  const startCalibration = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCalibrating(true);
    setCalibrationProgress(0);

    // 2-second calibration timer
    let progress = 0;
    calibrationTimer.current = setInterval(() => {
      progress += 5;
      setCalibrationProgress(progress);

      if (progress >= 100) {
        if (calibrationTimer.current) {
          clearInterval(calibrationTimer.current);
        }
        completeCalibration();
      }
    }, 100);
  };

  const cancelCalibration = () => {
    if (calibrationTimer.current) {
      clearInterval(calibrationTimer.current);
    }
    setIsCalibrating(false);
    setCalibrationProgress(0);
  };

  const completeCalibration = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const calibration: RimCalibration = {
      rimCenterX: circleX.value,
      rimCenterY: circleY.value,
      rimRadiusPx: CIRCLE_SIZE / 2,
      angle: selectedAngle,
      calibratedAt: new Date().toISOString(),
    };

    setIsCalibrating(false);
    navigation.navigate("SessionRecord", {
      calibration: JSON.stringify(calibration),
    });
  };

  if (!permission) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center">
        <Text className="text-white">Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center px-6">
        <Ionicons name="camera-outline" size={48} color="#737373" />
        <Text className="text-white text-lg font-semibold mt-4 text-center">
          Camera Access Required
        </Text>
        <Text className="text-neutral-400 text-center mt-2 mb-6">
          We need camera access to help you calibrate the rim position
        </Text>
        <Pressable
          onPress={requestPermission}
          className="bg-orange-500 px-6 py-3 rounded-xl active:opacity-80"
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Camera Preview */}
      <CameraView style={{ flex: 1 }} facing="back">
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
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>

            {/* Angle Toggle */}
            <View className="flex-row bg-black/50 rounded-full p-1">
              <Pressable
                onPress={() => setSelectedAngle("side")}
                className={`px-4 py-2 rounded-full ${
                  selectedAngle === "side" ? "bg-orange-500" : ""
                }`}
              >
                <Text className="text-white text-sm font-medium">Side</Text>
              </Pressable>
              <Pressable
                onPress={() => setSelectedAngle("front")}
                className={`px-4 py-2 rounded-full ${
                  selectedAngle === "front" ? "bg-orange-500" : ""
                }`}
              >
                <Text className="text-white text-sm font-medium">Front</Text>
              </Pressable>
            </View>

            <View className="w-10" />
          </View>

          {/* Instructions */}
          <View className="items-center mt-6 px-6">
            <View className="bg-black/60 rounded-2xl px-5 py-3">
              <Text className="text-white text-center text-base font-medium">
                {isCalibrating
                  ? "Hold steady..."
                  : "Align the circle with the rim"}
              </Text>
              <Text className="text-neutral-400 text-center text-sm mt-1">
                {isCalibrating
                  ? `${Math.round(calibrationProgress)}%`
                  : "Then tap and hold the button below"}
              </Text>
            </View>
          </View>

          {/* Calibration Circle */}
          <Animated.View
            style={[
              {
                position: "absolute",
                width: CIRCLE_SIZE,
                height: CIRCLE_SIZE,
                borderRadius: CIRCLE_SIZE / 2,
                borderWidth: 3,
                borderColor: isCalibrating ? "#22c55e" : "#f97316",
                backgroundColor: isCalibrating
                  ? "rgba(34, 197, 94, 0.1)"
                  : "rgba(249, 115, 22, 0.1)",
              },
              circleAnimatedStyle,
            ]}
          >
            {/* Crosshair */}
            <View className="absolute inset-0 items-center justify-center">
              <View
                className="absolute w-full h-0.5"
                style={{
                  backgroundColor: isCalibrating
                    ? "rgba(34, 197, 94, 0.5)"
                    : "rgba(249, 115, 22, 0.5)",
                }}
              />
              <View
                className="absolute h-full w-0.5"
                style={{
                  backgroundColor: isCalibrating
                    ? "rgba(34, 197, 94, 0.5)"
                    : "rgba(249, 115, 22, 0.5)",
                }}
              />
            </View>

            {/* Progress ring when calibrating */}
            {isCalibrating && (
              <View
                className="absolute inset-0 rounded-full border-4 border-green-500"
                style={{
                  borderTopColor: "transparent",
                  borderRightColor:
                    calibrationProgress > 25 ? "#22c55e" : "transparent",
                  borderBottomColor:
                    calibrationProgress > 50 ? "#22c55e" : "transparent",
                  borderLeftColor:
                    calibrationProgress > 75 ? "#22c55e" : "transparent",
                  transform: [{ rotate: "-90deg" }],
                }}
              />
            )}
          </Animated.View>

          {/* Bottom Controls */}
          <View
            className="absolute bottom-0 left-0 right-0 items-center"
            style={{ paddingBottom: insets.bottom + 30 }}
          >
            {/* Calibrate Button */}
            <Pressable
              onPressIn={startCalibration}
              onPressOut={cancelCalibration}
              className="active:scale-95"
            >
              <View
                className={`w-20 h-20 rounded-full items-center justify-center ${
                  isCalibrating ? "bg-green-500" : "bg-orange-500"
                }`}
              >
                <View
                  className={`w-16 h-16 rounded-full border-4 border-white items-center justify-center ${
                    isCalibrating ? "bg-green-500" : "bg-orange-500"
                  }`}
                >
                  <Ionicons
                    name={isCalibrating ? "checkmark" : "scan-outline"}
                    size={28}
                    color="#fff"
                  />
                </View>
              </View>
            </Pressable>

            <Text className="text-white/70 text-sm mt-4">
              Hold to calibrate
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}
