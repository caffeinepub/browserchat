import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConversationId,
  FileAttachment,
  Message,
  UserProfile,
} from "../backend";
import { ExternalBlob } from "../backend";
import { useActor } from "./useActor";

export function useGetCallerProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const query = useQuery<UserProfile | null>({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      try {
        return await actor.getCallerProfile();
      } catch {
        return null;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetAllUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile[]>({
    queryKey: ["allUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useGetMessages(convoId: ConversationId | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Message[]>({
    queryKey: ["messages", convoId],
    queryFn: async () => {
      if (!actor || !convoId) return [];
      return actor.getMessages(convoId);
    },
    enabled: !!actor && !isFetching && !!convoId,
    refetchInterval: 3000,
  });
}

export function useGetTypingParticipants(convoId: ConversationId | null) {
  const { actor, isFetching } = useActor();
  return useQuery<[string, Principal[]]>({
    queryKey: ["typing", convoId],
    queryFn: async () => {
      if (!actor || !convoId) return ["", []] as [string, Principal[]];
      return actor.getTypingParticipants(convoId);
    },
    enabled: !!actor && !isFetching && !!convoId,
    refetchInterval: 2000,
  });
}

export function useGetConversationReadStatus(convoId: ConversationId | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Array<[string, bigint]>>({
    queryKey: ["readStatus", convoId],
    queryFn: async () => {
      if (!actor || !convoId) return [];
      // getConversationReadStatus exists on the backend but is missing from the
      // generated backendInterface type in backend.ts — cast to any as workaround
      return (actor as any).getConversationReadStatus(convoId) as Promise<
        Array<[string, bigint]>
      >;
    },
    enabled: !!actor && !isFetching && !!convoId,
    refetchInterval: 3000,
  });
}

export function useGetUserProfile(principalStr: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", principalStr],
    queryFn: async () => {
      if (!actor || !principalStr) return null;
      try {
        const { Principal } = await import("@icp-sdk/core/principal");
        return await actor.getUserProfile(Principal.fromText(principalStr));
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!principalStr,
    refetchInterval: 10000,
  });
}

export function useMarkMessagesRead() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (convoId: ConversationId) => {
      if (!actor) throw new Error("No actor");
      return actor.markMessagesRead(convoId);
    },
  });
}

export function useRegisterProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (displayName: string) => {
      if (!actor) throw new Error("No actor");
      await actor.registerOrUpdateProfile(displayName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
    },
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      convoId,
      content,
      file,
    }: {
      convoId: ConversationId;
      content: string;
      file?: { bytes: Uint8Array<ArrayBuffer>; name: string };
    }) => {
      if (!actor) throw new Error("No actor");
      let fileAttachment: FileAttachment | null = null;
      if (file) {
        const blob = ExternalBlob.fromBytes(file.bytes);
        fileAttachment = { blob, name: file.name };
      }
      return actor.sendMessage(convoId, content, fileAttachment);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["messages", vars.convoId] });
    },
  });
}

export function useGetOrCreateConversation() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (participant: Principal) => {
      if (!actor) throw new Error("No actor");
      return actor.getOrCreateConversation(participant);
    },
  });
}

export function useSetTyping() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      convoId,
      isTyping,
    }: { convoId: ConversationId; isTyping: boolean }) => {
      if (!actor) throw new Error("No actor");
      return actor.setTyping(convoId, isTyping);
    },
  });
}

export function useUpdateLastSeen() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.updateLastSeen();
    },
  });
}
