import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { useState } from "react";
import type { UserProfile } from "../backend";
import { formatLastSeen, getInitials } from "../utils/time";

interface UserListProps {
  users: UserProfile[];
  currentUserName: string;
  onSelectUser: (user: UserProfile) => void;
}

export default function UserList({
  users,
  currentUserName,
  onSelectUser,
}: UserListProps) {
  const [search, setSearch] = useState("");

  const filtered = users.filter(
    (u) =>
      u.displayName !== currentUserName &&
      u.displayName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground mb-3">
          All Users
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-ocid="users.search_input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            className="pl-9 h-9 text-sm bg-input border-border"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div
            data-ocid="users.empty_state"
            className="p-6 text-center text-muted-foreground text-sm"
          >
            {search ? "No users found" : "No other users yet"}
          </div>
        ) : (
          <div className="py-2">
            {filtered.map((user, idx) => (
              <button
                type="button"
                key={user.displayName}
                data-ocid={`users.item.${idx + 1}`}
                onClick={() => onSelectUser(user)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback
                      className="text-sm font-semibold"
                      style={{
                        background: "oklch(0.35 0.06 230)",
                        color: "oklch(var(--foreground))",
                      }}
                    >
                      {getInitials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card"
                    style={{
                      background: user.online
                        ? "oklch(var(--online))"
                        : "oklch(0.45 0 0)",
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.online ? (
                      <span style={{ color: "oklch(var(--online))" }}>
                        Online
                      </span>
                    ) : (
                      formatLastSeen(user.lastSeen)
                    )}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
