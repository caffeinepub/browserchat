import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Paperclip, Send, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { ConversationId, UserProfile } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetMessages,
  useGetTypingParticipants,
  useSendMessage,
  useSetTyping,
} from "../hooks/useQueries";
import { formatLastSeen, formatMessageTime, getInitials } from "../utils/time";

interface ConversationViewProps {
  convoId: ConversationId;
  otherUser: UserProfile;
  onBack: () => void;
  notifyNewMessage: () => void;
}

export default function ConversationView({
  convoId,
  otherUser,
  onBack,
  notifyNewMessage,
}: ConversationViewProps) {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal().toString();

  const { data: messages = [] } = useGetMessages(convoId);
  const { data: typingData } = useGetTypingParticipants(convoId);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { mutate: setTyping } = useSetTyping();

  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<{
    bytes: Uint8Array<ArrayBuffer>;
    name: string;
    preview?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const prevMessageCountRef = useRef(messages.length);

  // Scroll to bottom when messages arrive
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional scroll-on-count-change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Detect new incoming messages and notify
  useEffect(() => {
    const prev = prevMessageCountRef.current;
    const current = messages.length;
    if (current > prev) {
      // Check if any new messages are from the other user
      const newMessages = messages.slice(prev);
      const hasIncoming = newMessages.some(
        (msg) => msg.sender.toString() !== myPrincipal,
      );
      if (hasIncoming) {
        notifyNewMessage();
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
      { convoId, content: text.trim(), file: pendingFile ?? undefined },
      {
        onSuccess: () => {
          setText("");
          setPendingFile(null);
        },
      },
    );
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

  const isImageFile = (name: string) =>
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

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
              {getInitials(otherUser.displayName)}
            </AvatarFallback>
          </Avatar>
          <span
            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card"
            style={{
              background: otherUser.online
                ? "oklch(var(--online))"
                : "oklch(0.45 0 0)",
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {otherUser.displayName}
          </p>
          <p className="text-xs">
            {otherUser.online ? (
              <span style={{ color: "oklch(var(--online))" }}>Online</span>
            ) : (
              <span className="text-muted-foreground">
                {formatLastSeen(otherUser.lastSeen)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
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
            return (
              <div
                key={String(msg.id)}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMine ? "rounded-br-sm" : "rounded-bl-sm"
                  }`}
                  style={{
                    background: isMine
                      ? "oklch(0.60 0.14 230)"
                      : "oklch(var(--secondary))",
                    color: "oklch(var(--foreground))",
                  }}
                >
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
                  <p className="text-xs opacity-60 mt-1 text-right">
                    {formatMessageTime(msg.timestamp)}
                  </p>
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
                  {otherUser.displayName} is typing
                </span>
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
            placeholder="Type a message…"
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
