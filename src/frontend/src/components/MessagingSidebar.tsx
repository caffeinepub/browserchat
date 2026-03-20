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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Principal } from "@icp-sdk/core/principal";
import {
  Check,
  ChevronRight,
  Copy,
  MessageSquare,
  Plus,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { ConversationId, UserProfile } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetOrCreateConversation,
  useGetUserProfile,
} from "../hooks/useQueries";
import ConversationView from "./ConversationView";

interface SavedContact {
  principal: string;
  displayName: string;
  convoId: string;
}

interface MessagingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  notifyNewMessage: () => void;
}

export default function MessagingSidebar({
  isOpen,
  onClose,
  currentUserName: _currentUserName,
  notifyNewMessage,
}: MessagingSidebarProps) {
  const { identity } = useInternetIdentity();
  const { mutate: getOrCreate, isPending } = useGetOrCreateConversation();

  const myPrincipal = identity?.getPrincipal().toString() ?? "";
  const CONTACTS_KEY = `browserchat_contacts_${myPrincipal}`;

  const loadContacts = (): SavedContact[] => {
    if (!myPrincipal) return [];
    try {
      return JSON.parse(localStorage.getItem(CONTACTS_KEY) ?? "[]");
    } catch {
      return [];
    }
  };

  const [contacts, setContacts] = useState<SavedContact[]>(() =>
    loadContacts(),
  );
  const [view, setView] = useState<"list" | "conversation">("list");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedPrincipal, setSelectedPrincipal] = useState<string | null>(
    null,
  );
  const [convoId, setConvoId] = useState<ConversationId | null>(null);
  const [newConvoOpen, setNewConvoOpen] = useState(false);
  const [principalInput, setPrincipalInput] = useState("");
  const [principalError, setPrincipalError] = useState("");
  const [copied, setCopied] = useState(false);

  // Live profile polling for the currently selected contact
  const { data: liveOtherUser } = useGetUserProfile(
    view === "conversation" ? selectedPrincipal : null,
  );

  const effectiveOtherUser: UserProfile | null = liveOtherUser ?? selectedUser;

  const saveContact = (contact: SavedContact) => {
    const existing = loadContacts();
    const idx = existing.findIndex((c) => c.principal === contact.principal);
    if (idx >= 0) {
      existing[idx] = contact;
    } else {
      existing.push(contact);
    }
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(existing));
    setContacts([...existing]);
  };

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
        const trimmed = principalInput.trim();
        const newContact: SavedContact = {
          principal: trimmed,
          displayName: `${trimmed.slice(0, 8)}...`,
          convoId: id,
        };
        saveContact(newContact);
        setConvoId(id);
        setSelectedPrincipal(trimmed);
        setSelectedUser({
          displayName: newContact.displayName,
          lastSeen: 0n,
          online: false,
        });
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

  const handleSelectContact = (contact: SavedContact) => {
    const principal = Principal.fromText(contact.principal);
    getOrCreate(principal, {
      onSuccess: (id) => {
        setConvoId(id);
        setSelectedPrincipal(contact.principal);
        setSelectedUser({
          displayName: contact.displayName,
          lastSeen: 0n,
          online: false,
        });
        setView("conversation");
      },
      onError: () => {
        toast.error("Could not open conversation.");
      },
    });
  };

  const handleBack = () => {
    setView("list");
    setSelectedUser(null);
    setSelectedPrincipal(null);
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
            {view === "conversation" && convoId && effectiveOtherUser ? (
              <ConversationView
                convoId={convoId}
                otherUser={effectiveOtherUser}
                otherUserPrincipal={selectedPrincipal ?? ""}
                onBack={handleBack}
                notifyNewMessage={notifyNewMessage}
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

                {/* Contacts list */}
                <div className="px-4 pt-2 pb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    My Contacts
                  </p>
                </div>

                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    {contacts.length === 0 ? (
                      <div
                        data-ocid="chat.empty_state"
                        className="flex flex-col items-center justify-center h-40 gap-3 px-6 text-center"
                      >
                        <MessageSquare
                          className="w-8 h-8"
                          style={{ color: "oklch(0.40 0.04 240)" }}
                        />
                        <p className="text-sm text-muted-foreground">
                          No contacts yet. Tap{" "}
                          <span className="text-foreground font-medium">+</span>{" "}
                          to start a new chat.
                        </p>
                      </div>
                    ) : (
                      <div className="px-2 py-1 space-y-0.5">
                        {contacts.map((contact, idx) => (
                          <button
                            type="button"
                            key={contact.principal}
                            data-ocid={`chat.item.${idx + 1}`}
                            onClick={() => handleSelectContact(contact)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-white/5 active:bg-white/10"
                          >
                            <Avatar className="w-9 h-9 flex-shrink-0">
                              <AvatarFallback
                                className="text-xs font-semibold"
                                style={{
                                  background: "oklch(0.28 0.06 230)",
                                  color: "oklch(0.75 0.10 230)",
                                }}
                              >
                                {contact.displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {contact.displayName}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono truncate">
                                {contact.principal.slice(0, 16)}...
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
