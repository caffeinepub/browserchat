import Map "mo:core/Map";

module {
  type UserId = Principal;
  type Timestamp = Int;
  type MessageId = Nat;
  type ConversationId = Text;

  type FileAttachment = {
    name : Text;
    blob : Blob;
  };

  type Message = {
    id : MessageId;
    sender : UserId;
    timestamp : Timestamp;
    content : Text;
    file : ?FileAttachment;
  };

  type Conversation = {
    id : ConversationId;
    participants : [UserId];
    messages : [Message];
    typingStates : Map.Map<UserId, Bool>;
    readUpTo : Map.Map<UserId, MessageId>;
  };

  type UserProfile = {
    displayName : Text;
    lastSeen : Timestamp;
    online : Bool;
  };

  type OldConversation = {
    id : ConversationId;
    participants : [UserId];
    messages : [Message];
    typingStates : Map.Map<UserId, Bool>;
  };

  type OldState = {
    conversations : Map.Map<ConversationId, OldConversation>;
    userProfiles : Map.Map<UserId, UserProfile>;
    typingStatus : Map.Map<ConversationId, Map.Map<UserId, Bool>>;
  };

  type NewState = {
    conversations : Map.Map<ConversationId, Conversation>;
    userProfiles : Map.Map<UserId, UserProfile>;
    typingStatus : Map.Map<ConversationId, Map.Map<UserId, Bool>>;
  };

  public func intoNewConversation(oldConvo : OldConversation) : Conversation {
    { oldConvo with readUpTo = Map.empty<UserId, MessageId>() };
  };

  public func run(old : OldState) : NewState {
    let newConversations = old.conversations.map<ConversationId, OldConversation, Conversation>(
      func(_id, convo) { intoNewConversation(convo) }
    );
    { old with conversations = newConversations };
  };
};
