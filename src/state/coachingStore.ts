import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CoachingSession,
  CorrectionCategory,
  FREE_ANALYSIS_LIMIT,
} from "../types/coaching";

interface CoachingStore {
  // Session data
  sessions: CoachingSession[];

  // Current focus tracking
  currentFocus: CorrectionCategory | null;
  focusStartDate: string | null;
  sessionsOnCurrentFocus: number;

  // Usage tracking
  totalAnalyses: number;
  isPro: boolean;

  // Actions
  addSession: (session: CoachingSession) => void;
  deleteSession: (id: string) => void;
  setCurrentFocus: (category: CorrectionCategory) => void;
  incrementFocusSessions: () => void;
  resetFocusSessions: () => void;
  setPro: (isPro: boolean) => void;
  getRecentSessions: (limit?: number) => CoachingSession[];
  getSessionById: (id: string) => CoachingSession | undefined;
  canAnalyze: () => boolean;
  getRemainingFreeAnalyses: () => number;
  resetStore: () => void;
}

const useCoachingStore = create<CoachingStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentFocus: null,
      focusStartDate: null,
      sessionsOnCurrentFocus: 0,
      totalAnalyses: 0,
      isPro: false,

      addSession: (session) => {
        set((state) => ({
          sessions: [session, ...state.sessions],
          totalAnalyses: state.totalAnalyses + 1,
        }));
      },

      deleteSession: (id) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
        }));
      },

      setCurrentFocus: (category) => {
        set({
          currentFocus: category,
          focusStartDate: new Date().toISOString(),
          sessionsOnCurrentFocus: 1,
        });
      },

      incrementFocusSessions: () => {
        set((state) => ({
          sessionsOnCurrentFocus: state.sessionsOnCurrentFocus + 1,
        }));
      },

      resetFocusSessions: () => {
        set({
          sessionsOnCurrentFocus: 0,
          focusStartDate: null,
        });
      },

      setPro: (isPro) => {
        set({ isPro });
      },

      getRecentSessions: (limit = 10) => {
        return get().sessions.slice(0, limit);
      },

      getSessionById: (id) => {
        return get().sessions.find((s) => s.id === id);
      },

      canAnalyze: () => {
        const state = get();
        if (state.isPro) return true;
        return state.totalAnalyses < FREE_ANALYSIS_LIMIT;
      },

      getRemainingFreeAnalyses: () => {
        const state = get();
        if (state.isPro) return Infinity;
        return Math.max(0, FREE_ANALYSIS_LIMIT - state.totalAnalyses);
      },

      resetStore: () => {
        set({
          sessions: [],
          currentFocus: null,
          focusStartDate: null,
          sessionsOnCurrentFocus: 0,
          totalAnalyses: 0,
          isPro: false,
        });
      },
    }),
    {
      name: "coaching-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        currentFocus: state.currentFocus,
        focusStartDate: state.focusStartDate,
        sessionsOnCurrentFocus: state.sessionsOnCurrentFocus,
        totalAnalyses: state.totalAnalyses,
        isPro: state.isPro,
      }),
    }
  )
);

export default useCoachingStore;
