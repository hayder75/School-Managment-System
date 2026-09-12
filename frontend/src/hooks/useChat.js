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

export function useContacts(params = {}) {
  return useQuery({
    queryKey: ["chat-contacts", params],
    queryFn: () => api.get("/chat/contacts", { params }),
  });
}

export function useStartDirect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.post("/chat/conversations/direct", { user_id: userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content }) =>
      api.post(`/chat/conversations/${conversationId}/messages`, { content }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useReportConversation() {  return useMutation({
    mutationFn: ({ conversationId, reason, message_id }) =>
      api.post(`/chat/conversations/${conversationId}/report`, { reason, message_id }),
  });
}

export function useChatReports(params = {}) {
  return useQuery({
    queryKey: ["chat-reports", params],
    queryFn: () => api.get("/chat/reports", { params }),
  });
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reportId) => api.patch(`/chat/reports/${reportId}/resolve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-reports"] }),
  });
}

export function useRestrictUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, active, reason }) => api.post(`/chat/users/${userId}/restrict`, { active, reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat-restricted"] }),
  });
}

export function useRestrictedUsers() {
  return useQuery({
    queryKey: ["chat-restricted"],
    queryFn: () => api.get("/chat/restricted"),
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
