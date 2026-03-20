import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  LogOut,
  MoreVertical,
  RefreshCw,
  Star,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useUpdateLastSeen } from "../hooks/useQueries";
import MessagingSidebar from "./MessagingSidebar";

const DEFAULT_URL = "https://en.wikipedia.org/wiki/Main_Page";

interface BrowserAppProps {
  currentUserName: string;
}

export default function BrowserApp({ currentUserName }: BrowserAppProps) {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [inputUrl, setInputUrl] = useState(DEFAULT_URL);
  const [iframeKey, setIframeKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { mutate: updateLastSeen } = useUpdateLastSeen();

  useEffect(() => {
    updateLastSeen();
    const interval = setInterval(() => updateLastSeen(), 30_000);
    return () => clearInterval(interval);
  }, [updateLastSeen]);

  const navigate = (targetUrl: string) => {
    let finalUrl = targetUrl.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      if (finalUrl.includes(".") && !finalUrl.includes(" ")) {
        finalUrl = `https://${finalUrl}`;
      } else {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
      }
    }
    setUrl(finalUrl);
    setInputUrl(finalUrl);
    setIframeKey((k) => k + 1);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(inputUrl);
  };

  const handleBack = () => {
    iframeRef.current?.contentWindow?.history.back();
  };

  const handleForward = () => {
    iframeRef.current?.contentWindow?.history.forward();
  };

  const handleRefresh = () => {
    setIframeKey((k) => k + 1);
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Browser toolbar */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0"
        style={{ background: "oklch(var(--card))" }}
      >
        {/* macOS-style window dots */}
        <div className="flex items-center gap-1.5 mr-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: "#FF5F57" }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: "#FFBD2E" }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: "#28C840" }}
          />
        </div>

        <Button
          data-ocid="browser.back_button"
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="w-7 h-7 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button
          data-ocid="browser.forward_button"
          variant="ghost"
          size="icon"
          onClick={handleForward}
          className="w-7 h-7 text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button
          data-ocid="browser.refresh_button"
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          className="w-7 h-7 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>

        <form onSubmit={handleUrlSubmit} className="flex-1 mx-2">
          <input
            data-ocid="browser.input"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full h-8 bg-input border border-border rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-colors"
            placeholder="Search or enter URL"
            spellCheck={false}
            autoComplete="off"
          />
        </form>

        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-muted-foreground hover:text-foreground"
        >
          <Star className="w-4 h-4" />
        </Button>

        <Button
          data-ocid="browser.open_modal_button"
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen((v) => !v)}
          className="w-7 h-7 relative"
          style={{ color: sidebarOpen ? "oklch(0.60 0.14 230)" : undefined }}
          title="Open messages"
        >
          <MoreVertical className="w-4 h-4" />
          {!sidebarOpen && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full"
              style={{ background: "oklch(0.60 0.14 230)" }}
            />
          )}
        </Button>

        <Button
          data-ocid="browser.secondary_button"
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="w-7 h-7 text-muted-foreground hover:text-destructive"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* iFrame area */}
      <div className="flex-1 relative overflow-hidden">
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={url}
          className="w-full h-full border-none"
          title="Browser"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
        />
      </div>

      <MessagingSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentUserName={currentUserName}
      />
    </div>
  );
}
