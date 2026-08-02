import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useAnnouncements(params = {}, options = {}) {
  return useQuery({
    queryKey: ["announcements", params],
    queryFn: () => api.get("/announcements", { params }),
    ...options,
  });
}

export function useMyAnnouncements(classId, options = {}) {
  return useQuery({
    queryKey: ["announcements", "my", classId],
    queryFn: () => api.get("/announcements/my", { params: { class_id: classId } }),
    ...options,
  });
}

export function useAnnouncement(id) {
  return useQuery({
    queryKey: ["announcements", id],
    queryFn: () => api.get(`/announcements/${id}`),
    enabled: !!id,
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/announcements", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/announcements/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/announcements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}
