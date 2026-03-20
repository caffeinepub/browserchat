import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useRegisterProfile } from "../hooks/useQueries";

interface ProfileSetupProps {
  onComplete: () => void;
}

export default function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [displayName, setDisplayName] = useState("");
  const { mutate, isPending, isError } = useRegisterProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    mutate(displayName.trim(), { onSuccess: onComplete });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, oklch(0.22 0.04 230 / 0.35) 0%, transparent 70%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div
          className="rounded-2xl p-8 border border-border shadow-panel"
          style={{ background: "oklch(var(--card))" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 mx-auto"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.18 195), oklch(0.60 0.14 230))",
            }}
          >
            <User className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-center text-foreground mb-2">
            Set up your profile
          </h1>
          <p className="text-center text-muted-foreground text-sm mb-8">
            Choose a display name visible to others
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label
                htmlFor="displayName"
                className="text-sm font-medium text-foreground mb-1.5 block"
              >
                Display Name
              </Label>
              <Input
                data-ocid="profile.input"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                className="h-11 bg-input border-border text-foreground placeholder:text-muted-foreground"
                autoFocus
                maxLength={40}
              />
            </div>
            {isError && (
              <p
                data-ocid="profile.error_state"
                className="text-destructive text-sm"
              >
                Failed to save profile. Please try again.
              </p>
            )}
            <Button
              data-ocid="profile.submit_button"
              type="submit"
              disabled={isPending || !displayName.trim()}
              className="w-full h-11 font-semibold rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.62 0.14 230), oklch(0.52 0.16 235))",
                border: "none",
              }}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
