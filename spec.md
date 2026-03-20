# BrowserChat

## Current State
- Backend has `UserProfile` with `lastSeen` and `online` fields
- Frontend shows online/offline status in UserList and ConversationView
- `formatLastSeen` is implemented and used, but `MessagingSidebar` creates fake contacts with `lastSeen: 0n` instead of fetching real profiles
- No read receipt tracking exists in the backend
- Typing indicators are implemented
- Messages are polled every 3 seconds

## Requested Changes (Diff)

### Add
- Backend: `readUpTo` map (userId -> lastReadMessageId) per conversation to track who has seen which messages
- Backend: `markMessagesRead(convoId)` function for recipient to mark messages as read
- Backend: `getUserProfile(userId)` query to fetch another user's profile by principal
- Frontend: Read receipt checkmarks on sent messages (single tick = sent, double tick = seen by recipient)
- Frontend: Fetch real UserProfile when opening a conversation so lastSeen is accurate
- Frontend: Auto-call markMessagesRead when conversation is open and new messages arrive

### Modify
- Backend: `Conversation` type gains `readUpTo: Map<UserId, MessageId>` field
- Frontend: `ConversationView` shows read receipt icons per outgoing message
- Frontend: `MessagingSidebar` fetches actual user profile by principal when opening conversation instead of using `lastSeen: 0n`

### Remove
- Nothing removed

## Implementation Plan
1. Add `readUpTo` map to Conversation type in backend
2. Add `markMessagesRead(convoId)` shared func that sets caller's readUpTo to latest message id
3. Add `getUserProfile(userId)` query func
4. Regenerate frontend bindings
5. In MessagingSidebar, fetch real UserProfile when opening a contact's conversation
6. In ConversationView, call markMessagesRead when messages are loaded/updated
7. In ConversationView, show read receipt checkmarks: single check = sent, double blue check = recipient's readUpTo >= this message's id
