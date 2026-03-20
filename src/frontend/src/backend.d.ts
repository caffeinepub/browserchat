import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export type ConversationId = string;
export type UserId = Principal;
export type Timestamp = bigint;
export interface FileAttachment {
    blob: ExternalBlob;
    name: string;
}
export type MessageId = bigint;
export interface Message {
    id: MessageId;
    content: string;
    file?: FileAttachment;
    sender: UserId;
    timestamp: Timestamp;
}
export interface UserProfile {
    displayName: string;
    lastSeen: Timestamp;
    online: boolean;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getAllUsers(): Promise<Array<UserProfile>>;
    getCallerProfile(): Promise<UserProfile>;
    getCallerUserRole(): Promise<UserRole>;
    getMessages(convoId: ConversationId): Promise<Array<Message>>;
    getOrCreateConversation(participant: UserId): Promise<ConversationId>;
    getTypingParticipants(convoId: ConversationId): Promise<[string, Array<UserId>]>;
    isCallerAdmin(): Promise<boolean>;
    registerOrUpdateProfile(displayName: string): Promise<void>;
    sendMessage(convoId: ConversationId, content: string, fileAttachment: FileAttachment | null): Promise<MessageId>;
    setTyping(convoId: ConversationId, isTyping: boolean): Promise<void>;
    updateLastSeen(): Promise<void>;
}
