import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
import SessionsScreen from "../screens/SessionsScreen";
import VideoCaptureScreen from "../screens/VideoCaptureScreen";
import CoachFeedbackScreen from "../screens/CoachFeedbackScreen";
import SessionDetailScreen from "../screens/SessionDetailScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PaywallScreen from "../screens/PaywallScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import CreateAccountScreen from "../screens/CreateAccountScreen";
import SignInScreen from "../screens/SignInScreen";
import SessionCaptureGuidanceScreen from "../screens/SessionCaptureGuidanceScreen";
import RimCalibrationScreen from "../screens/RimCalibrationScreen";
import SessionRecordScreen from "../screens/SessionRecordScreen";
import SessionResultsScreen from "../screens/SessionResultsScreen";
import AnalyzingScreen from "../screens/AnalyzingScreen";

export type RootStackParamList = {
  MainTabs: undefined;
  VideoCapture: undefined;
  Analyzing: { videoUri: string; sessionId: string };
  CoachFeedback: { sessionId: string };
  SessionDetail: { sessionId: string };
  Profile: undefined;
  Paywall: { fromOnboarding?: boolean } | undefined;
  Onboarding: undefined;
  CreateAccount: undefined;
  SignIn: undefined;
  // Session Analysis flow
  SessionCaptureGuidance: undefined;
  RimCalibration: undefined;
  SessionRecord: { calibration: string }; // JSON stringified RimCalibration
  SessionResults: { sessionId: string };
};

export type TabParamList = {
  Home: undefined;
  Sessions: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0a0a0a",
          borderTopColor: "#262626",
          borderTopWidth: 0.5,
          paddingTop: 8,
          height: 88,
        },
        tabBarActiveTintColor: "#f97316",
        tabBarInactiveTintColor: "#737373",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Sessions"
        component={SessionsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0a0a0a" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="VideoCapture"
        component={VideoCaptureScreen}
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="Analyzing"
        component={AnalyzingScreen}
        options={{
          headerShown: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="CoachFeedback"
        component={CoachFeedbackScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="CreateAccount"
        component={CreateAccountScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      {/* Session Analysis Flow */}
      <Stack.Screen
        name="SessionCaptureGuidance"
        component={SessionCaptureGuidanceScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="RimCalibration"
        component={RimCalibrationScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="SessionRecord"
        component={SessionRecordScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="SessionResults"
        component={SessionResultsScreen}
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.92],
          sheetGrabberVisible: true,
          sheetCornerRadius: 24,
        }}
      />
    </Stack.Navigator>
  );
}
