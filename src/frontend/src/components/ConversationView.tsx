import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  FileText,
  Paperclip,
  Reply,
  Send,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { ConversationId, Message, UserProfile } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetConversationReadStatus,
  useGetMessages,
  useGetTypingParticipants,
  useGetUserProfile,
  useMarkMessagesRead,
  useSendMessage,
  useSetTyping,
  useUpdateLastSeen,
} from "../hooks/useQueries";
import {
  formatLastSeen,
  formatMessageTime,
  getInitials,
  isOnlineFromLastSeen,
} from "../utils/time";

interface ConversationViewProps {
  convoId: ConversationId;
  otherUser: UserProfile;
  otherUserPrincipal: string;
  onBack: () => void;
  notifyNewMessage: (isChatActive: boolean) => void;
}

interface SwipeState {
  startX: number;
  startY: number;
  msgId: bigint;
}

export default function ConversationView({
  convoId,
  otherUser,
  otherUserPrincipal,
  onBack,
  notifyNewMessage,
}: ConversationViewProps) {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();

  const { data: messages = [] } = useGetMessages(convoId);
  const { data: typingData } = useGetTypingParticipants(convoId);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { mutate: setTyping } = useSetTyping();
  const { mutate: markRead } = useMarkMessagesRead();
  const { data: readStatusData } = useGetConversationReadStatus(convoId);
  const { data: liveProfile } = useGetUserProfile(otherUserPrincipal);
  const { mutate: updateLastSeen } = useUpdateLastSeen();

  const profile: UserProfile = liveProfile ?? otherUser;
  // Derive online status from lastSeen timestamp (backend field may be stale)
  const isOnline = isOnlineFromLastSeen(profile.lastSeen);

  // Keep current user's lastSeen updated while they're in this conversation
  useEffect(() => {
    updateLastSeen();
    const interval = setInterval(() => updateLastSeen(), 30_000);
    return () => clearInterval(interval);
  }, [updateLastSeen]);

  const readStatusMap = new Map<string, bigint>();
  if (readStatusData) {
    for (const [p, id] of readStatusData) {
      readStatusMap.set(p, id);
    }
  }

  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<{
    bytes: Uint8Array<ArrayBuffer>;
    name: string;
    preview?: string;
  } | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const prevMessageCountRef = useRef(messages.length);
  const swipeRef = useRef<SwipeState | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional scroll-on-count-change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mark read on new messages
  useEffect(() => {
    if (messages.length > 0) {
      markRead(convoId);
    }
  }, [messages.length, convoId]);

  useEffect(() => {
    const prev = prevMessageCountRef.current;
    const current = messages.length;
    if (current > prev) {
      const newMessages = messages.slice(prev);
      const hasIncoming = newMessages.some(
        (msg) => msg.sender.toString() !== myPrincipal,
      );
      if (hasIncoming) {
        // Pass true = user is actively on the chat screen, suppress notification
        notifyNewMessage(true);
      }
    }
    prevMessageCountRef.current = current;
  }, [messages, myPrincipal, notifyNewMessage]);

  const otherIsTyping = typingData?.[1].some(
    (p) => p.toString() !== myPrincipal,
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setTyping({ convoId, isTyping: true });
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      setTyping({ convoId, isTyping: false });
    }, 2000);
  };

  const handleSend = () => {
    if (!text.trim() && !pendingFile) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    setTyping({ convoId, isTyping: false });
    sendMessage(
      {
        convoId,
        content: text.trim(),
        file: pendingFile ?? undefined,
        replyToId: replyingTo?.id ?? undefined,
      },
      {
        onSuccess: () => {
          setText("");
          setPendingFile(null);
          setReplyingTo(null);
        },
      },
    );
    // Clear input immediately for snappy feel
    setText("");
    setReplyingTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let preview: string | undefined;
    if (file.type.startsWith("image/")) {
      preview = URL.createObjectURL(file);
    }
    setPendingFile({ bytes, name: file.name, preview });
    e.target.value = "";
  };

  useEffect(() => {
    const url = pendingFile?.preview;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [pendingFile?.preview]);

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent, msg: Message) => {
    swipeRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      msgId: msg.id,
    };
  };

  const handleTouchMove = (e: React.TouchEvent, msg: Message) => {
    if (!swipeRef.current || swipeRef.current.msgId !== msg.id) return;
    const deltaX = e.touches[0].clientX - swipeRef.current.startX;
    const deltaY = Math.abs(e.touches[0].clientY - swipeRef.current.startY);
    if (deltaX > 0 && deltaX > deltaY) {
      const offset = Math.min(deltaX, 80);
      setSwipeOffsets((prev) => ({ ...prev, [String(msg.id)]: offset }));
    }
  };

  const handleTouchEnd = (msg: Message) => {
    const offset = swipeOffsets[String(msg.id)] ?? 0;
    if (offset > 50) {
      setReplyingTo(msg);
    }
    setSwipeOffsets((prev) => ({ ...prev, [String(msg.id)]: 0 }));
    swipeRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent, msg: Message) => {
    swipeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      msgId: msg.id,
    };
  };

  const handleMouseUp = (e: React.MouseEvent, msg: Message) => {
    if (!swipeRef.current || swipeRef.current.msgId !== msg.id) return;
    const deltaX = e.clientX - swipeRef.current.startX;
    if (deltaX > 50) {
      setReplyingTo(msg);
    }
    setSwipeOffsets((prev) => ({ ...prev, [String(msg.id)]: 0 }));
    swipeRef.current = null;
  };

  const isImageFile = (name: string) =>
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  const otherReadUpTo = readStatusMap.get(otherUserPrincipal) ?? -1n;

  const getQuotedMessage = (replyToId: bigint): Message | undefined =>
    messages.find((m) => m.id === replyToId);

  const getQuotedSenderName = (senderId: string) =>
    senderId === myPrincipal ? "You" : profile.displayName;

  const getQuotedPreview = (msg: Message): string => {
    if (msg.content)
      return (
        msg.content.slice(0, 60) + (msg.content.length > 60 ? "\u2026" : "")
      );
    if (msg.file) return `\uD83D\uDCCE ${msg.file.name}`;
    return "\uD83D\uDCCE File";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Button
          data-ocid="chat.back_button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="w-8 h-8 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="relative">
          <Avatar className="w-9 h-9">
            <AvatarFallback
              className="text-xs font-semibold"
              style={{
                background: "oklch(0.35 0.06 230)",
                color: "oklch(var(--foreground))",
              }}
            >
              {getInitials(profile.displayName)}
            </AvatarFallback>
          </Avatar>
          <span
            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card"
            style={{
              background: isOnline ? "oklch(var(--online))" : "oklch(0.45 0 0)",
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {profile.displayName}
          </p>
          <p className="text-xs">
            {isOnline ? (
              <span style={{ color: "oklch(var(--online))" }}>Online</span>
            ) : (
              <span className="text-muted-foreground">
                {profile.lastSeen > 0n
                  ? formatLastSeen(profile.lastSeen)
                  : "Offline"}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2 overflow-x-hidden"
      >
        {messages.length === 0 ? (
          <div
            data-ocid="chat.empty_state"
            className="flex items-center justify-center h-full"
          >
            <p className="text-muted-foreground text-sm">
              No messages yet. Say hello! 👋
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender.toString() === myPrincipal;
            const isSeen = isMine && otherReadUpTo >= msg.id;
            const swipeOffset = swipeOffsets[String(msg.id)] ?? 0;
            const quotedMsg = msg.replyToId
              ? getQuotedMessage(msg.replyToId)
              : undefined;

            return (
              <div
                key={String(msg.id)}
                className={`flex ${isMine ? "justify-end" : "justify-start"} relative`}
              >
                {/* Reply icon shown on swipe */}
                {swipeOffset > 10 && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full"
                    style={{
                      opacity: Math.min(swipeOffset / 50, 1),
                      background: "oklch(0.35 0.06 230)",
                    }}
                  >
                    <Reply className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMine ? "rounded-br-sm" : "rounded-bl-sm"
                  } select-none`}
                  style={{
                    background: isMine
                      ? "oklch(0.60 0.14 230)"
                      : "oklch(var(--secondary))",
                    color: "oklch(var(--foreground))",
                    transform: `translateX(${swipeOffset}px)`,
                    transition:
                      swipeOffset === 0 ? "transform 0.2s ease" : "none",
                    touchAction: "pan-y",
                  }}
                  onTouchStart={(e) => handleTouchStart(e, msg)}
                  onTouchMove={(e) => handleTouchMove(e, msg)}
                  onTouchEnd={() => handleTouchEnd(msg)}
                  onMouseDown={(e) => handleMouseDown(e, msg)}
                  onMouseUp={(e) => handleMouseUp(e, msg)}
                >
                  {/* Quoted block */}
                  {quotedMsg && (
                    <div
                      className="mb-2 rounded-lg px-3 py-1.5 text-xs border-l-2"
                      style={{
                        background: isMine
                          ? "oklch(0.50 0.12 230)"
                          : "oklch(0.28 0.02 230)",
                        borderLeftColor: "oklch(0.75 0.14 200)",
                      }}
                    >
                      <p
                        className="font-semibold mb-0.5"
                        style={{ color: "oklch(0.80 0.14 200)" }}
                      >
                        {getQuotedSenderName(quotedMsg.sender.toString())}
                      </p>
                      <p className="opacity-80 truncate">
                        {getQuotedPreview(quotedMsg)}
                      </p>
                    </div>
                  )}

                  {msg.content && (
                    <p className="text-sm leading-relaxed break-words">
                      {msg.content}
                    </p>
                  )}
                  {msg.file && (
                    <div className="mt-1">
                      {isImageFile(msg.file.name) ? (
                        <img
                          src={msg.file.blob.getDirectURL()}
                          alt={msg.file.name}
                          className="max-w-full rounded-lg max-h-48 object-cover"
                        />
                      ) : (
                        <a
                          href={msg.file.blob.getDirectURL()}
                          download={msg.file.name}
                          className="flex items-center gap-2 text-sm underline opacity-90 hover:opacity-100"
                        >
                          <FileText className="w-4 h-4" />
                          {msg.file.name}
                        </a>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <p className="text-xs opacity-60">
                      {formatMessageTime(msg.timestamp)}
                    </p>
                    {isMine &&
                      (isSeen ? (
                        <CheckCheck
                          size={12}
                          style={{ color: "oklch(0.80 0.14 200)" }}
                        />
                      ) : (
                        <Check
                          size={12}
                          className="text-muted-foreground opacity-60"
                        />
                      ))}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <AnimatePresence>
          {otherIsTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex justify-start"
            >
              <div
                className="rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1"
                style={{ background: "oklch(var(--secondary))" }}
              >
                <span className="text-xs text-muted-foreground mr-1">
                  {profile.displayName} is typing
                </span>
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reply preview bar */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="px-4 pb-1"
          >
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 border-l-2"
              style={{
                background: "oklch(0.22 0.03 230)",
                borderLeftColor: "oklch(0.60 0.14 230)",
              }}
            >
              <Reply
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "oklch(0.60 0.14 230)" }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-semibold"
                  style={{ color: "oklch(0.80 0.14 200)" }}
                >
                  {getQuotedSenderName(replyingTo.sender.toString())}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {getQuotedPreview(replyingTo)}
                </p>
              </div>
              <button
                type="button"
                data-ocid="chat.cancel_button"
                onClick={() => setReplyingTo(null)}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File preview */}
      {pendingFile && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 bg-accent rounded-lg px-3 py-2">
            {pendingFile.preview ? (
              <img
                src={pendingFile.preview}
                className="w-10 h-10 rounded object-cover"
                alt="preview"
              />
            ) : (
              <FileText className="w-5 h-5 text-muted-foreground" />
            )}
            <span className="text-sm text-foreground flex-1 truncate">
              {pendingFile.name}
            </span>
            <button
              type="button"
              data-ocid="chat.close_button"
              onClick={() => setPendingFile(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="*/*"
          />
          <Button
            data-ocid="chat.upload_button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <input
            data-ocid="chat.input"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message\u2026"
            className="flex-1 h-10 bg-input border border-border rounded-xl px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-colors"
          />
          <Button
            data-ocid="chat.submit_button"
            size="icon"
            onClick={handleSend}
            disabled={isSending || (!text.trim() && !pendingFile)}
            className="w-9 h-9 flex-shrink-0 rounded-xl"
            style={{ background: "oklch(0.60 0.14 230)", border: "none" }}
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
