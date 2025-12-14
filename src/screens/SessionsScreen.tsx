import React, { useRef } from "react";
import { View, Text, Pressable, FlatList, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Swipeable } from "react-native-gesture-handler";
import { Video, ResizeMode } from "expo-av";
import * as Haptics from "expo-haptics";
import { format } from "date-fns";

import useCoachingStore from "../state/coachingStore";
import { CoachingSession, CORRECTION_LABELS } from "../types/coaching";
import { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Calculate form score based on correction category
const getFormScore = (category: string): number => {
  const categoryScores: Record<string, number> = {
    balance_verticality: 75,
    shot_line_integrity: 82,
    set_point_consistency: 88,
    release_follow_through: 92,
  };
  return categoryScores[category] || 85;
};

const getScoreColor = (score: number): string => {
  if (score >= 90) return "bg-green-500";
  if (score >= 80) return "bg-green-500";
  if (score >= 70) return "bg-yellow-500";
  return "bg-orange-500";
};

export default function SessionsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const sessions = useCoachingStore((s) => s.sessions);
  const deleteSession = useCoachingStore((s) => s.deleteSession);
  
  // Track open swipeable refs to close them when needed
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const handleSessionPress = async (sessionId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("SessionDetail", { sessionId });
  };

  const handleDelete = async (sessionId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      "Delete Session",
      "Are you sure you want to delete this session? This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            swipeableRefs.current.get(sessionId)?.close();
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteSession(sessionId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const renderRightActions = (sessionId: string) => {
    return (
      <Pressable
        onPress={() => handleDelete(sessionId)}
        className="bg-red-500 rounded-2xl mb-3 justify-center items-center px-6 ml-3"
      >
        <Ionicons name="trash-outline" size={24} color="white" />
        <Text className="text-white text-xs mt-1 font-medium">Delete</Text>
      </Pressable>
    );
  };

  const renderSession = ({ item, index }: { item: CoachingSession; index: number }) => {
    const date = new Date(item.date);
    const formattedDate = format(date, "MMM d");
    const formattedTime = format(date, "h:mm a");
    const score = getFormScore(item.feedback.correctionCategory);

    return (
      <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
        <Swipeable
          ref={(ref) => {
            if (ref) {
              swipeableRefs.current.set(item.id, ref);
            } else {
              swipeableRefs.current.delete(item.id);
            }
          }}
          renderRightActions={() => renderRightActions(item.id)}
          overshootRight={false}
          friction={2}
        >
          <Pressable
            onPress={() => handleSessionPress(item.id)}
            className="bg-neutral-900 rounded-2xl p-3 mb-3 border border-neutral-800 active:opacity-80"
          >
            <View className="flex-row">
              {/* Video Thumbnail */}
              <View 
                className="rounded-xl overflow-hidden bg-neutral-800 mr-3"
                style={{ width: 70, height: 100 }}
              >
                {item.videoUri ? (
                  <Video
                    source={{ uri: item.videoUri }}
                    rate={1.0}
                    volume={0.0}
                    isMuted={true}
                    shouldPlay={false}
                    resizeMode={ResizeMode.COVER}
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Ionicons name="videocam-outline" size={24} color="#525252" />
                  </View>
                )}
                {/* Score Badge on thumbnail */}
                <View 
                  className={`absolute bottom-1 right-1 ${getScoreColor(score)} rounded-md px-1.5 py-0.5`}
                >
                  <Text className="text-white text-xs font-bold">{score}</Text>
                </View>
              </View>

              {/* Content */}
              <View className="flex-1 justify-between py-1">
                {/* Date and Time */}
                <View className="flex-row items-center">
                  <Text className="text-neutral-500 text-xs">
                    {formattedDate}
                  </Text>
                  <View className="w-1 h-1 rounded-full bg-neutral-600 mx-2" />
                  <Text className="text-neutral-500 text-xs">
                    {formattedTime}
                  </Text>
                </View>

                {/* Primary Focus */}
                <Text
                  className="text-white text-base font-medium leading-5 my-1"
                  numberOfLines={2}
                >
                  {item.feedback.primaryFocus}
                </Text>

                {/* Category Tag */}
                <View className="flex-row items-center">
                  <View className="bg-orange-500/20 px-2 py-1 rounded-md">
                    <Text className="text-orange-400 text-xs font-medium">
                      {CORRECTION_LABELS[item.feedback.correctionCategory]}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Chevron */}
              <View className="justify-center pl-2">
                <Ionicons name="chevron-forward" size={18} color="#525252" />
              </View>
            </View>
          </Pressable>
        </Swipeable>
      </Animated.View>
    );
  };

  const ListHeaderComponent = () => (
    <View className="mb-4">
      <Text className="text-neutral-400 text-sm">
        Review your progress • Swipe left to delete
      </Text>
    </View>
  );

  const ListEmptyComponent = () => (
    <View className="items-center justify-center py-20">
      <View className="w-20 h-20 rounded-full bg-neutral-900 items-center justify-center mb-4">
        <Ionicons name="basketball-outline" size={36} color="#525252" />
      </View>
      <Text className="text-white text-lg font-semibold mb-2">
        No sessions yet
      </Text>
      <Text className="text-neutral-500 text-sm text-center px-8 leading-5">
        Upload your first clip to start tracking your progress and get personalized coaching.
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-neutral-950">
      {/* Header */}
      <View
        className="px-5 pb-4 border-b border-neutral-900"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-2xl font-bold">
            Sessions
          </Text>
          {sessions.length > 0 && (
            <View className="bg-neutral-800 px-3 py-1 rounded-full">
              <Text className="text-neutral-400 text-sm font-medium">
                {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Session List */}
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderSession}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={sessions.length > 0 ? ListHeaderComponent : null}
        ListEmptyComponent={ListEmptyComponent}
      />
    </View>
  );
}
