import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Principal } from "@icp-sdk/core/principal";
import { Check, Copy, MessageSquare, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { ConversationId, UserProfile } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetAllUsers,
  useGetOrCreateConversation,
} from "../hooks/useQueries";
import ConversationView from "./ConversationView";
import UserList from "./UserList";

interface MessagingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
}

export default function MessagingSidebar({
  isOpen,
  onClose,
  currentUserName,
}: MessagingSidebarProps) {
  const { identity } = useInternetIdentity();
  const { data: users = [] } = useGetAllUsers();
  const { mutate: getOrCreate, isPending } = useGetOrCreateConversation();

  const [view, setView] = useState<"list" | "conversation">("list");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [convoId, setConvoId] = useState<ConversationId | null>(null);
  const [newConvoOpen, setNewConvoOpen] = useState(false);
  const [principalInput, setPrincipalInput] = useState("");
  const [principalError, setPrincipalError] = useState("");
  const [copied, setCopied] = useState(false);

  const myPrincipal = identity?.getPrincipal().toString() ?? "";

  const handleCopyPrincipal = () => {
    navigator.clipboard.writeText(myPrincipal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartConversation = () => {
    setPrincipalError("");
    let principal: Principal;
    try {
      principal = Principal.fromText(principalInput.trim());
    } catch {
      setPrincipalError("Invalid principal ID");
      return;
    }

    getOrCreate(principal, {
      onSuccess: (id) => {
        setConvoId(id);
        const matchedUser = users.find(
          (u) => u.displayName !== currentUserName,
        );
        setSelectedUser(
          matchedUser ?? {
            displayName: `${principalInput.slice(0, 10)}...`,
            lastSeen: 0n,
            online: false,
          },
        );
        setView("conversation");
        setNewConvoOpen(false);
        setPrincipalInput("");
      },
      onError: () => {
        setPrincipalError(
          "Could not start conversation. Check the principal ID.",
        );
      },
    });
  };

  const handleSelectUser = (user: UserProfile) => {
    toast.info(
      `To chat with ${user.displayName}, ask them to share their principal ID, then use the + button`,
      { duration: 5000 },
    );
  };

  const handleBack = () => {
    setView("list");
    setSelectedUser(null);
    setConvoId(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            data-ocid="chat.panel"
            className="fixed top-0 right-0 h-full z-50 w-80 flex flex-col border-l border-border shadow-panel"
            style={{ background: "oklch(var(--card))" }}
          >
            {view === "conversation" && convoId && selectedUser ? (
              <ConversationView
                convoId={convoId}
                otherUser={selectedUser}
                onBack={handleBack}
              />
            ) : (
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center gap-2 p-4 border-b border-border">
                  <MessageSquare
                    className="w-5 h-5"
                    style={{ color: "oklch(0.60 0.14 230)" }}
                  />
                  <span className="text-base font-semibold text-foreground flex-1">
                    BrowserChat
                  </span>

                  <Dialog open={newConvoOpen} onOpenChange={setNewConvoOpen}>
                    <DialogTrigger asChild>
                      <Button
                        data-ocid="chat.open_modal_button"
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-foreground"
                        title="New conversation"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      className="border-border"
                      style={{ background: "oklch(var(--popover))" }}
                    >
                      <DialogHeader>
                        <DialogTitle className="text-foreground">
                          Start a conversation
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-2">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Your principal ID (share this with others):
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-muted/40 rounded px-2 py-1.5 text-foreground font-mono truncate">
                              {myPrincipal}
                            </code>
                            <Button
                              data-ocid="chat.secondary_button"
                              variant="ghost"
                              size="icon"
                              onClick={handleCopyPrincipal}
                              className="w-7 h-7 flex-shrink-0"
                            >
                              {copied ? (
                                <Check className="w-4 h-4 text-online" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Enter the other person&apos;s principal ID:
                          </p>
                          <Input
                            data-ocid="chat.input"
                            value={principalInput}
                            onChange={(e) => {
                              setPrincipalInput(e.target.value);
                              setPrincipalError("");
                            }}
                            placeholder="2vxsx-fae..."
                            className="font-mono text-xs h-10 bg-input border-border"
                          />
                          {principalError && (
                            <p
                              data-ocid="chat.error_state"
                              className="text-destructive text-xs mt-1"
                            >
                              {principalError}
                            </p>
                          )}
                        </div>
                        <Button
                          data-ocid="chat.submit_button"
                          onClick={handleStartConversation}
                          disabled={isPending || !principalInput.trim()}
                          className="w-full"
                          style={{
                            background:
                              "linear-gradient(135deg, oklch(0.62 0.14 230), oklch(0.52 0.16 235))",
                            border: "none",
                          }}
                        >
                          {isPending ? "Starting..." : "Start Chat"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    data-ocid="chat.close_button"
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="w-7 h-7 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* My principal display */}
                <div
                  className="mx-4 mt-3 mb-2 rounded-lg p-2.5 flex items-center gap-2"
                  style={{ background: "oklch(0.18 0.022 240)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Your ID</p>
                    <p className="text-xs text-foreground font-mono truncate">
                      {myPrincipal.slice(0, 20)}...
                    </p>
                  </div>
                  <Button
                    data-ocid="chat.toggle"
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyPrincipal}
                    className="w-6 h-6 flex-shrink-0 text-muted-foreground hover:text-foreground"
                    title="Copy your principal ID"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-online" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>

                <div className="flex-1 overflow-hidden">
                  <UserList
                    users={users}
                    currentUserName={currentUserName}
                    onSelectUser={handleSelectUser}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
