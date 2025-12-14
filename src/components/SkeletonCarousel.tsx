import React, { useState, useRef } from "react";
import { View, Text, Dimensions, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import PagerView from "react-native-pager-view";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SkeletonCarouselProps {
  frames: string[];
  labels?: string[];
  onFrameChange?: (index: number) => void;
}

const DEFAULT_LABELS = ["Setup", "Lift", "Set Point", "Release", "Follow-through"];

export default function SkeletonCarousel({
  frames,
  labels,
  onFrameChange,
}: SkeletonCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  const frameLabels = labels || DEFAULT_LABELS.slice(0, frames.length);

  const handlePageChange = (index: number) => {
    setCurrentIndex(index);
    onFrameChange?.(index);
  };

  const goToFrame = async (index: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pagerRef.current?.setPage(index);
  };

  if (frames.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="body-outline" size={40} color="#525252" />
        <Text style={styles.emptyText}>No skeleton frames available</Text>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.container}>
      {/* Frame counter */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Form Analysis</Text>
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {frames.length}
          </Text>
        </View>
      </View>

      {/* Skeleton frame carousel */}
      <View style={styles.carouselContainer}>
        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={0}
          onPageSelected={(e) => handlePageChange(e.nativeEvent.position)}
        >
          {frames.map((uri, index) => (
            <View key={index} style={styles.frameContainer}>
              <Image
                source={{ uri }}
                style={styles.frameImage}
                contentFit="contain"
                transition={200}
              />
              {/* Frame label overlay */}
              <View style={styles.labelOverlay}>
                <View style={styles.labelBadge}>
                  <Text style={styles.labelText}>
                    {frameLabels[index] || `Frame ${index + 1}`}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </PagerView>

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <Pressable
            style={[styles.navArrow, styles.navArrowLeft]}
            onPress={() => goToFrame(currentIndex - 1)}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </Pressable>
        )}
        {currentIndex < frames.length - 1 && (
          <Pressable
            style={[styles.navArrow, styles.navArrowRight]}
            onPress={() => goToFrame(currentIndex + 1)}
          >
            <Ionicons name="chevron-forward" size={24} color="white" />
          </Pressable>
        )}
      </View>

      {/* Frame selector dots */}
      <View style={styles.dotsContainer}>
        {frames.map((_, index) => (
          <Pressable key={index} onPress={() => goToFrame(index)}>
            <View
              style={[
                styles.dot,
                currentIndex === index && styles.dotActive,
              ]}
            />
          </Pressable>
        ))}
      </View>

      {/* Quick jump labels */}
      <View style={styles.quickJumpContainer}>
        {frameLabels.map((label, index) => (
          <Pressable
            key={index}
            onPress={() => goToFrame(index)}
            style={[
              styles.quickJumpButton,
              currentIndex === index && styles.quickJumpButtonActive,
            ]}
          >
            <Text
              style={[
                styles.quickJumpText,
                currentIndex === index && styles.quickJumpTextActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  emptyContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#171717",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    color: "#525252",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    color: "#a3a3a3",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  counter: {
    backgroundColor: "#262626",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    color: "#a3a3a3",
    fontSize: 12,
    fontWeight: "500",
  },
  carouselContainer: {
    width: "100%",
    aspectRatio: 9 / 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
    position: "relative",
  },
  pager: {
    flex: 1,
  },
  frameContainer: {
    flex: 1,
    width: "100%",
  },
  frameImage: {
    width: "100%",
    height: "100%",
  },
  labelOverlay: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  labelBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  labelText: {
    color: "#f97316",
    fontSize: 14,
    fontWeight: "600",
  },
  navArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  navArrowLeft: {
    left: 8,
  },
  navArrowRight: {
    right: 8,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#404040",
  },
  dotActive: {
    backgroundColor: "#f97316",
    width: 24,
  },
  quickJumpContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  quickJumpButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#262626",
  },
  quickJumpButtonActive: {
    backgroundColor: "#f97316",
  },
  quickJumpText: {
    color: "#a3a3a3",
    fontSize: 12,
    fontWeight: "500",
  },
  quickJumpTextActive: {
    color: "white",
  },
});
