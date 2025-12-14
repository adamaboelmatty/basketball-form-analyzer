import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface GuidanceItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const guidanceItems: GuidanceItem[] = [
  {
    icon: "phone-portrait-outline",
    title: "Stable phone position",
    description: "Prop your phone securely - no hand-held recording",
  },
  {
    icon: "basketball-outline",
    title: "Hoop fully visible",
    description: "Make sure the entire rim is in frame throughout",
  },
  {
    icon: "location-outline",
    title: "Free throw line recommended",
    description: "Consistent distance helps track your patterns",
  },
  {
    icon: "repeat-outline",
    title: "Record 5-10 shots",
    description: "More shots = better pattern detection",
  },
];

export default function SessionCaptureGuidanceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const handleContinue = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("RimCalibration");
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-neutral-950">
      <LinearGradient
        colors={["#171717", "#0a0a0a"]}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View
          className="flex-row items-center px-5"
          style={{ paddingTop: insets.top + 10 }}
        >
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 rounded-full bg-neutral-800/50 items-center justify-center active:opacity-70"
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View className="flex-1" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(500)}
            className="mb-8"
          >
            <Text className="text-white text-2xl font-bold text-center">
              Session Recording Setup
            </Text>
            <Text className="text-neutral-400 text-base text-center mt-2">
              Follow these guidelines for accurate pattern detection
            </Text>
          </Animated.View>

          {/* Guidance Items */}
          <View className="mb-8">
            {guidanceItems.map((item, index) => (
              <Animated.View
                key={item.title}
                entering={FadeInUp.delay(150 + index * 75).duration(500)}
                className="mb-4"
              >
                <View className="bg-neutral-900/50 rounded-2xl p-4 border border-neutral-800/50">
                  <View className="flex-row items-start">
                    <View className="w-12 h-12 rounded-xl bg-orange-500/10 items-center justify-center mr-4">
                      <Ionicons name={item.icon} size={24} color="#f97316" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-base font-semibold mb-1">
                        {item.title}
                      </Text>
                      <Text className="text-neutral-400 text-sm leading-5">
                        {item.description}
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Info Box */}
          <Animated.View
            entering={FadeInUp.delay(500).duration(500)}
            className="mb-8"
          >
            <View className="bg-blue-500/10 rounded-2xl p-4 border border-blue-500/20">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={22} color="#3b82f6" />
                <View className="flex-1 ml-3">
                  <Text className="text-blue-400 text-sm font-medium mb-1">
                    What you will see
                  </Text>
                  <Text className="text-blue-300/70 text-sm leading-5">
                    Arc, depth, and consistency trends across your session. No specific numbers - just clear patterns to help your practice.
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Continue Button */}
          <Animated.View entering={FadeInUp.delay(600).duration(500)}>
            <Pressable onPress={handleContinue} className="active:scale-98">
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
                  Set Up Camera
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
