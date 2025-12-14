import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface OnboardingStore {
  hasCompletedOnboarding: boolean;
  hasCreatedAccount: boolean;
  selectedGoals: string[];
  setGoals: (goals: string[]) => void;
  completeOnboarding: () => void;
  completeAccountCreation: () => void;
  resetOnboarding: () => void;
}

const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      hasCreatedAccount: false,
      selectedGoals: [],

      setGoals: (goals) => {
        set({ selectedGoals: goals });
      },

      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true });
      },

      completeAccountCreation: () => {
        set({ hasCreatedAccount: true });
      },

      resetOnboarding: () => {
        set({ hasCompletedOnboarding: false, hasCreatedAccount: false, selectedGoals: [] });
      },
    }),
    {
      name: "onboarding-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useOnboardingStore;
