import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConversationId,
  FileAttachment,
  Message,
  MessageId,
  UserProfile,
} from "../backend";
import { ExternalBlob } from "../backend";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export function useGetCallerProfile() {
  const { actor, isFetching: actorFetching, isError: actorError } = useActor();
  const query = useQuery<UserProfile | null>({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getCallerProfile();
      } catch {
        return null;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  // If actor failed or actor is done loading but is null, treat as fetched
  const actorDoneButNull = !actorFetching && !actor && !actorError;
  const isFetched = actorError
    ? true
    : actorDoneButNull
      ? true
      : !!actor && query.isFetched;

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched,
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
    refetchInterval: 1500,
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
    refetchInterval: 5000,
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
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      convoId,
      content,
      file,
      replyToId,
    }: {
      convoId: ConversationId;
      content: string;
      file?: { bytes: Uint8Array<ArrayBuffer>; name: string };
      replyToId?: MessageId;
    }) => {
      if (!actor) throw new Error("No actor");
      let fileAttachment: FileAttachment | null = null;
      if (file) {
        const blob = ExternalBlob.fromBytes(file.bytes);
        fileAttachment = { blob, name: file.name };
      }
      return (actor as any).sendMessage(
        convoId,
        content,
        fileAttachment,
        replyToId ?? null,
      );
    },
    onMutate: async (vars) => {
      const myPrincipal = identity?.getPrincipal();
      if (!myPrincipal || vars.file) return; // skip optimistic for file uploads

      await queryClient.cancelQueries({ queryKey: ["messages", vars.convoId] });
      const previous = queryClient.getQueryData<Message[]>([
        "messages",
        vars.convoId,
      ]);

      const existingMessages = previous ?? [];
      const tempId = BigInt(Date.now()) * 1_000_000n;
      const optimisticMessage: Message = {
        id: tempId,
        sender: myPrincipal,
        timestamp: BigInt(Date.now()) * 1_000_000n,
        content: vars.content,
        replyToId: vars.replyToId,
      };

      queryClient.setQueryData<Message[]>(
        ["messages", vars.convoId],
        [...existingMessages, optimisticMessage],
      );

      return { previous };
    },
    onError: (_err, vars, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(["messages", vars.convoId], context.previous);
      }
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

export function useSaveFcmToken() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (token: string) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).saveFcmToken(token);
    },
  });
}
