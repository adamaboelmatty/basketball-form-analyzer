import React, { useState, useEffect } from "react";
import { View, Text, Dimensions, StyleSheet } from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { CorrectionCategory } from "../types/coaching";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface FormAnalysisOverlayProps {
  videoUri: string;
  correctionCategory: CorrectionCategory;
  isPlaying?: boolean;
  showAnnotations?: boolean;
}

// Annotation configurations based on correction category
const ANNOTATION_CONFIG: Record<CorrectionCategory, {
  title: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  overlayAreas: Array<{
    top: string;
    left: string;
    width: string;
    height: string;
    label: string;
  }>;
}> = {
  balance_verticality: {
    title: "Balance Check",
    color: "#f97316",
    icon: "body-outline",
    overlayAreas: [
      { top: "70%", left: "30%", width: "40%", height: "25%", label: "Feet & Base" },
      { top: "20%", left: "35%", width: "30%", height: "40%", label: "Body Alignment" },
    ],
  },
  shot_line_integrity: {
    title: "Shot Line",
    color: "#3b82f6",
    icon: "arrow-up-outline",
    overlayAreas: [
      { top: "30%", left: "40%", width: "25%", height: "15%", label: "Elbow Position" },
      { top: "15%", left: "35%", width: "30%", height: "20%", label: "Ball Path" },
    ],
  },
  set_point_consistency: {
    title: "Set Point",
    color: "#8b5cf6",
    icon: "locate-outline",
    overlayAreas: [
      { top: "10%", left: "30%", width: "40%", height: "25%", label: "Set Point" },
    ],
  },
  release_follow_through: {
    title: "Release",
    color: "#22c55e",
    icon: "hand-right-outline",
    overlayAreas: [
      { top: "5%", left: "35%", width: "30%", height: "20%", label: "Follow Through" },
      { top: "10%", left: "40%", width: "25%", height: "15%", label: "Wrist Snap" },
    ],
  },
};

function PulsingOverlay({ 
  area, 
  color, 
  delay 
}: { 
  area: { top: string; left: string; width: string; height: string; label: string };
  color: string;
  delay: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.overlayArea,
        {
          top: area.top,
          left: area.left,
          width: area.width,
          height: area.height,
          borderColor: color,
          backgroundColor: `${color}15`,
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.labelContainer, { backgroundColor: color }]}>
        <Text style={styles.labelText}>{area.label}</Text>
      </View>
    </Animated.View>
  );
}

function ScanLine({ color }: { color: string }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(300, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.scanLine, { backgroundColor: color }, animatedStyle]} />
  );
}

export default function FormAnalysisOverlay({
  videoUri,
  correctionCategory,
  isPlaying = true,
  showAnnotations = true,
}: FormAnalysisOverlayProps) {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const config = ANNOTATION_CONFIG[correctionCategory];

  // Extract thumbnail for static display
  useEffect(() => {
    async function extractThumbnail() {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: 1000,
          quality: 0.8,
        });
        setThumbnailUri(uri);
      } catch (error) {
        console.error("Failed to extract thumbnail:", error);
      }
    }
    extractThumbnail();
  }, [videoUri]);

  return (
    <View style={styles.container}>
      {/* Video or Thumbnail */}
      <View style={styles.videoContainer}>
        {isPlaying ? (
          <Video
            source={{ uri: videoUri }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted
          />
        ) : thumbnailUri ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={styles.video}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.video, styles.placeholder]}>
            <Ionicons name="videocam-outline" size={40} color="#525252" />
          </View>
        )}

        {/* Annotation Overlays */}
        {showAnnotations && (
          <View style={styles.overlayContainer}>
            {/* Scan line effect */}
            <ScanLine color={config.color} />

            {/* Corner brackets */}
            <View style={[styles.cornerBracket, styles.topLeft, { borderColor: config.color }]} />
            <View style={[styles.cornerBracket, styles.topRight, { borderColor: config.color }]} />
            <View style={[styles.cornerBracket, styles.bottomLeft, { borderColor: config.color }]} />
            <View style={[styles.cornerBracket, styles.bottomRight, { borderColor: config.color }]} />

            {/* Area highlights */}
            {config.overlayAreas.map((area, index) => (
              <PulsingOverlay
                key={index}
                area={area}
                color={config.color}
                delay={index * 200}
              />
            ))}

            {/* Focus badge */}
            <Animated.View 
              entering={FadeIn.delay(500).duration(500)}
              style={styles.focusBadge}
            >
              <View style={[styles.focusBadgeInner, { backgroundColor: config.color }]}>
                <Ionicons name={config.icon} size={14} color="white" />
                <Text style={styles.focusBadgeText}>{config.title}</Text>
              </View>
            </Animated.View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  videoContainer: {
    width: "100%",
    aspectRatio: 9 / 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#171717",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0a0a",
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.6,
  },
  cornerBracket: {
    position: "absolute",
    width: 30,
    height: 30,
    borderWidth: 3,
  },
  topLeft: {
    top: 12,
    left: 12,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 12,
    right: 12,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 12,
    left: 12,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 12,
    right: 12,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  overlayArea: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 8,
    borderStyle: "dashed",
  },
  labelContainer: {
    position: "absolute",
    bottom: -10,
    left: "50%",
    transform: [{ translateX: -40 }],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  labelText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  focusBadge: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
  },
  focusBadgeInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  focusBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
