import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Order "mo:core/Order";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

actor {
  include MixinStorage();

  // Authorization/Accounts
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Type Definitions
  type UserId = Principal;
  type Timestamp = Time.Time;
  type ConversationId = Text;
  type MessageId = Nat;

  type FileAttachment = {
    name : Text;
    blob : Storage.ExternalBlob;
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
  };

  type UserProfile = {
    displayName : Text;
    lastSeen : Timestamp;
    online : Bool;
  };

  type MessagingAppState = {
    conversations : Map.Map<Text, Conversation>;
    typingStatus : Map.Map<Text, Map.Map<UserId, Bool>>;
    userProfiles : Map.Map<UserId, UserProfile>;
    nextMessageId : Nat;
  };

  module UserProfile {
    public func compareByUsername(p1 : UserProfile, p2 : UserProfile) : Order.Order {
      Text.compare(p1.displayName, p2.displayName);
    };
  };

  // Initial State
  let conversations = Map.empty<ConversationId, Conversation>();
  let userProfiles = Map.empty<UserId, UserProfile>();
  let typingStatus = Map.empty<ConversationId, Map.Map<UserId, Bool>>();

  // Helper Functions
  func getUserProfileInternal(userId : UserId) : UserProfile {
    switch (userProfiles.get(userId)) {
      case (?profile) { profile };
      case (null) { Runtime.trap("User profile does not exist") };
    };
  };

  func getConversationInternal(convoId : ConversationId) : Conversation {
    switch (conversations.get(convoId)) {
      case (?convo) { convo };
      case (null) { Runtime.trap("Conversation does not exist") };
    };
  };

  // User Management
  public shared ({ caller }) func registerOrUpdateProfile(displayName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can register or update profiles");
    };

    if (getLength(displayName) > 32) {
      Runtime.trap("Display name must be at most 32 characters");
    };
    if (displayName.size() <= 0) {
      Runtime.trap("Display name must be a valid non-empty string");
    };

    let newProfile = {
      displayName;
      lastSeen = Time.now();
      online = true;
    };
    userProfiles.add(caller, newProfile);
  };

  // Get the number of characters in a Text value.
  func getLength(text : Text) : Nat {
    text.chars().foldLeft(0, func(acc, _) { acc + 1 });
  };

  public shared ({ caller }) func updateLastSeen() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update last seen");
    };

    let profile = getUserProfileInternal(caller);
    userProfiles.add(
      caller,
      {
        profile with
        lastSeen = Time.now();
        online = true;
      },
    );
  };

  // Conversations
  public shared ({ caller }) func getOrCreateConversation(participant : UserId) : async ConversationId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create conversations");
    };

    if (caller == participant) { Runtime.trap("Cannot start conversation with yourself") };
    if (not userProfiles.containsKey(participant)) {
      Runtime.trap("Participant does not exist");
    };
    let id = generateConversationId(caller, participant);

    if (not conversations.containsKey(id)) {
      let newConvo : Conversation = {
        id;
        participants = [caller, participant];
        messages = [];
        typingStates = Map.empty<UserId, Bool>();
      };
      conversations.add(id, newConvo);
    };
    id;
  };

  func generateConversationId(user1 : UserId, user2 : UserId) : ConversationId {
    Text.fromArray((user1.toText() # user2.toText()).toArray().sort());
  };

  // Messaging
  public shared ({ caller }) func sendMessage(convoId : ConversationId, content : Text, fileAttachment : ?FileAttachment) : async MessageId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };

    let convo = getConversationInternal(convoId);

    if (not convo.participants.find(func(user) { user == caller }).isSome()) {
      Runtime.trap("Only participants can send messages to this conversation")
    };

    if (content.size() <= 0 and fileAttachment.isNull()) {
      Runtime.trap("Message cannot be empty");
    };

    if (convo.messages.size() > 500) {
      Runtime.trap("Messages in a conversation must be at most 500");
    };

    let newMsg : Message = {
      id = convo.messages.size();
      sender = caller;
      timestamp = Time.now();
      content;
      file = fileAttachment;
    };

    let updatedMessages = convo.messages.concat([newMsg]);
    let newConvo = {
      convo with
      messages = updatedMessages;
    };
    conversations.add(convoId, newConvo);
    newMsg.id;
  };

  public query ({ caller }) func getMessages(convoId : ConversationId) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can read messages");
    };

    let convo = getConversationInternal(convoId);

    if (not convo.participants.find(func(user) { user == caller }).isSome()) {
      Runtime.trap("Only participants can read messages in this conversation");
    };

    convo.messages;
  };

  // Typing Status
  public shared ({ caller }) func setTyping(convoId : ConversationId, isTyping : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set typing status");
    };

    let convo = getConversationInternal(convoId);
    if (not convo.participants.find(func(user) { user == caller }).isSome()) {
      Runtime.trap("Only participants can update typing status for this conversation");
    };

    let updatedTyping = Map.empty<UserId, Bool>();
    updatedTyping.add(caller, isTyping);

    let newConvo = {
      convo with
      typingStates = updatedTyping;
    };
    conversations.add(convoId, newConvo);
  };

  public query ({ caller }) func getTypingParticipants(convoId : ConversationId) : async (Text, [UserId]) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view typing status");
    };

    let convo = getConversationInternal(convoId);

    if (not convo.participants.find(func(user) { user == caller }).isSome()) {
      Runtime.trap("Only participants can view typing status in this conversation");
    };

    let typingUsers = List.empty<UserId>();

    for ((user, isTyping) in convo.typingStates.entries()) {
      if (isTyping and convo.participants.find(func(u) { u == user }).isSome()) {
        typingUsers.add(user);
      };
    };
    let users = typingUsers.toArray();
    (convo.id, users);
  };

  // User Directory
  public query ({ caller }) func getAllUsers() : async [UserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view user directory");
    };

    userProfiles.values().toArray().sort(UserProfile.compareByUsername);
  };

  public query ({ caller }) func getCallerProfile() : async UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their profile");
    };

    getUserProfileInternal(caller);
  };
};
