import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

interface SavedContact {
  principal: string;
  displayName: string;
  convoId: string;
}

// Background poller: detects new messages in all saved contacts
// and fires onNewMessage when a new message from someone else arrives
export function useBackgroundMessages(
  onNewMessage: () => void,
  sidebarOpen: boolean,
  activePrincipal: string | null,
) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const myPrincipal = identity?.getPrincipal().toString() ?? "";
  const lastCountsRef = useRef<Record<string, number>>({});
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!actor || !myPrincipal) return;

    const poll = async () => {
      if (!myPrincipal) return;
      const contactsKey = `browserchat_contacts_${myPrincipal}`;
      let contacts: SavedContact[] = [];
      try {
        contacts = JSON.parse(localStorage.getItem(contactsKey) ?? "[]");
      } catch {
        return;
      }

      for (const contact of contacts) {
        try {
          const msgs = await (actor as any).getMessages(contact.convoId);
          const count: number = msgs.length;
          const prev = lastCountsRef.current[contact.convoId];

          if (prev === undefined) {
            // First poll — just record baseline, don't notify
            lastCountsRef.current[contact.convoId] = count;
            continue;
          }

          if (count > prev) {
            // Check if any new messages are from someone else
            const newMsgs = msgs.slice(prev);
            const hasIncoming = newMsgs.some(
              (m: any) => m.sender.toString() !== myPrincipal,
            );

            lastCountsRef.current[contact.convoId] = count;

            // Invalidate query cache so ConversationView stays fresh
            queryClient.invalidateQueries({
              queryKey: ["messages", contact.convoId],
            });

            if (hasIncoming) {
              // Only notify if the chat with this contact is not active
              const isActive =
                sidebarOpen && activePrincipal === contact.principal;
              if (!isActive) {
                onNewMessage();
              }
            }
          } else {
            lastCountsRef.current[contact.convoId] = count;
          }
        } catch {
          // ignore per-contact errors
        }
      }

      initializedRef.current = true;
    };

    // Poll immediately then every 3 seconds
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [
    actor,
    myPrincipal,
    sidebarOpen,
    activePrincipal,
    onNewMessage,
    queryClient,
  ]);
}
