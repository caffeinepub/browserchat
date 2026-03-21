import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import BrowserApp from "./components/BrowserApp";
import LoginScreen from "./components/LoginScreen";
import ProfileSetup from "./components/ProfileSetup";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerProfile } from "./hooks/useQueries";

// ICP cold starts can take 60+ seconds — give plenty of room before giving up
const LOADING_TIMEOUT_MS = 90000;

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { actor, isFetching: actorFetching, isError: actorError } = useActor();

  const {
    data: profile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerProfile();

  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [dotCount, setDotCount] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timeout: only active while authenticated and actor/profile not ready
  const isStillLoading =
    isAuthenticated &&
    !actorError &&
    !loadingTimedOut &&
    (!actor || !profileFetched);

  useEffect(() => {
    if (!isStillLoading) {
      setLoadingTimedOut(false);
      setElapsedSeconds(0);
      return;
    }
    const timer = setTimeout(() => {
      setLoadingTimedOut(true);
    }, LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isStillLoading]);

  // Elapsed seconds counter while loading
  useEffect(() => {
    if (!isStillLoading) return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isStillLoading]);

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

  // 1. Identity still initializing
  if (isInitializing) {
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

  // 2. Not authenticated — show login
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen />
        <Toaster />
      </>
    );
  }

  // 3. Authenticated — actor not ready yet (fetching or null before query starts)
  if ((actorFetching || !actor) && !actorError && !loadingTimedOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "oklch(0.60 0.14 230)" }}
        />
        <p className="text-xs text-muted-foreground">
          Connecting{".".repeat(dotCount)}
        </p>
        {elapsedSeconds >= 10 && (
          <p className="text-xs text-muted-foreground opacity-60">
            This can take up to a minute on first load
          </p>
        )}
      </div>
    );
  }

  // 4. Actor error or timeout — show error screen
  if (actorError || loadingTimedOut) {
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
          data-ocid="error.primary_button"
        >
          Refresh
        </button>
      </div>
    );
  }

  // 5. Actor ready — wait for profile
  if (!profileFetched || profileLoading) {
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

  // 6. Profile setup needed
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

  // 7. App ready
  if (showApp && profile) {
    return (
      <>
        <BrowserApp currentUserName={profile.displayName} />
        <Toaster />
      </>
    );
  }

  // Fallback spinner
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
