import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginScreen() {
  const { login, loginStatus } = useInternetIdentity();
  const isLoggingIn = loginStatus === "logging-in";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {/* Background radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, oklch(0.22 0.04 230 / 0.35) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div
          className="rounded-2xl p-8 border border-border shadow-panel"
          style={{ background: "oklch(var(--card))" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.72 0.18 195), oklch(0.60 0.14 230))",
              }}
            >
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-foreground">
              BrowserChat
            </span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            Welcome back
          </h1>
          <p className="text-muted-foreground mb-8 text-sm">
            Sign in to access your messages and browse the web
          </p>

          <Button
            data-ocid="login.primary_button"
            onClick={() => login()}
            disabled={isLoggingIn}
            className="w-full h-11 text-sm font-semibold rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.62 0.14 230), oklch(0.52 0.16 235))",
              border: "none",
            }}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...
              </>
            ) : (
              "Sign in with Internet Identity"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-6">
            New users will be prompted to set up a profile after sign in.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
