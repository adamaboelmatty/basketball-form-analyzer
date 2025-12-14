import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  authMethod: "apple" | "email";
  createdAt: string;
}

interface AuthTokens {
  idToken: string;
  refreshToken: string;
  expiresAt: number; // timestamp
}

interface UserStore {
  user: UserProfile | null;
  isAuthenticated: boolean;
  setUser: (user: UserProfile) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  clearUser: () => void;
}

// Secure storage for auth tokens (separate from user profile)
const TOKEN_KEY = "shooting_lab_auth_tokens";

export async function saveAuthTokens(tokens: AuthTokens): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.error("Failed to save auth tokens:", error);
  }
}

export async function getAuthTokens(): Promise<AuthTokens | null> {
  try {
    const tokensStr = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!tokensStr) return null;
    return JSON.parse(tokensStr);
  } catch (error) {
    console.error("Failed to get auth tokens:", error);
    return null;
  }
}

export async function clearAuthTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error("Failed to clear auth tokens:", error);
  }
}

export async function getValidIdToken(): Promise<string | null> {
  const tokens = await getAuthTokens();
  if (!tokens) return null;

  // Check if token is expired (with 5 min buffer)
  const now = Date.now();
  if (tokens.expiresAt - 5 * 60 * 1000 < now) {
    // Token expired or about to expire, need to refresh
    // This would call refreshIdToken from firebase-auth
    // For now, return null to trigger re-auth
    return null;
  }

  return tokens.idToken;
}

const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => {
        set({ user, isAuthenticated: true });
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },

      clearUser: () => {
        // Also clear auth tokens
        clearAuthTokens();
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useUserStore;
