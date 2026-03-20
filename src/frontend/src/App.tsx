import { Toaster } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import BrowserApp from "./components/BrowserApp";
import LoginScreen from "./components/LoginScreen";
import ProfileSetup from "./components/ProfileSetup";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetAllUsers, useGetCallerProfile } from "./hooks/useQueries";

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const {
    data: profile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerProfile();

  const showProfileSetup =
    isAuthenticated && profileFetched && !profileLoading && profile === null;
  const showApp =
    isAuthenticated && profileFetched && !profileLoading && profile !== null;

  if (isInitializing || (isAuthenticated && !profileFetched)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "oklch(0.60 0.14 230)" }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen />
        <Toaster />
      </>
    );
  }

  if (showProfileSetup) {
    return (
      <>
        <ProfileSetup
          onComplete={() => {
            /* query invalidation happens in useRegisterProfile */
          }}
        />
        <Toaster />
      </>
    );
  }

  if (showApp && profile) {
    return (
      <>
        <BrowserApp currentUserName={profile.displayName} />
        <Toaster />
      </>
    );
  }

  // Fallback loading
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2
        className="w-8 h-8 animate-spin"
        style={{ color: "oklch(0.60 0.14 230)" }}
      />
    </div>
  );
}
