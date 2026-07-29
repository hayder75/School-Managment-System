import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get("/chat/conversations"),
  });
}

export function useMessages(conversationId) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => api.get(`/chat/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/chat/conversations", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useTeachers() {
  return useQuery({
    queryKey: ["chat-teachers"],
    queryFn: () => api.get("/chat/teachers"),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId) => api.put(`/chat/conversations/${conversationId}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useChatUnread() {
  return useQuery({
    queryKey: ["chat-unread"],
    queryFn: () => api.get("/chat/unread"),
    refetchInterval: 30000,
  });
}
