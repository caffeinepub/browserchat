import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import BrowserApp from "./components/BrowserApp";
import LoginScreen from "./components/LoginScreen";
import ProfileSetup from "./components/ProfileSetup";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerProfile } from "./hooks/useQueries";

const LOADING_TIMEOUT_MS = 45000;

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { isFetching: actorFetching } = useActor();
  const actorError = false;

  const {
    data: profile,
    isLoading: profileLoading,
    isFetched: profileFetched,
    isError: profileError,
  } = useGetCallerProfile();

  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    if (!isAuthenticated || profileFetched) {
      setLoadingTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      setLoadingTimedOut(true);
    }, LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isAuthenticated, profileFetched]);

  // Animated dots for loading message
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((d) => (d % 3) + 1);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  const showProfileSetup =
    isAuthenticated && profileFetched && !profileLoading && profile === null;
  const showApp =
    isAuthenticated && profileFetched && !profileLoading && profile !== null;

  if (
    isInitializing ||
    (isAuthenticated && actorFetching && !profileFetched && !loadingTimedOut)
  ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "oklch(0.60 0.14 230)" }}
        />
        <p className="text-xs text-muted-foreground">
          Connecting{".".repeat(dotCount)}
        </p>
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

  if (actorError || profileError || loadingTimedOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
        <p className="text-muted-foreground text-sm text-center px-6">
          Could not connect to the network. Please check your connection and try
          again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "oklch(0.60 0.14 230)", color: "white" }}
        >
          Refresh
        </button>
      </div>
    );
  }

  if (isAuthenticated && !profileFetched) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "oklch(0.60 0.14 230)" }}
        />
        <p className="text-xs text-muted-foreground">
          Loading your profile{".".repeat(dotCount)}
        </p>
      </div>
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <Loader2
        className="w-8 h-8 animate-spin"
        style={{ color: "oklch(0.60 0.14 230)" }}
      />
      <p className="text-xs text-muted-foreground">
        Loading{".".repeat(dotCount)}
      </p>
    </div>
  );
}
