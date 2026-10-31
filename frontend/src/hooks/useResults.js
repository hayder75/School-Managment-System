import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useResultSummary(options = {}) {
  return useQuery({
    queryKey: ["result-summary"],
    queryFn: () => api.get("/results/summary"),
    ...options,
  });
}

export function useResultList(params = {}, options = {}) {
  return useQuery({
    queryKey: ["result-list", params],
    queryFn: () => api.get("/results", { params }),
    ...options,
  });
}

export function useResultDetail(id) {
  return useQuery({
    queryKey: ["result-detail", id],
    queryFn: () => api.get(`/results/${id}`),
    enabled: !!id,
  });
}

export function useReviewResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, comment }) => api.post(`/results/${id}/review`, { decision, comment }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["result-summary"] });
      qc.invalidateQueries({ queryKey: ["result-list"] });
      qc.invalidateQueries({ queryKey: ["result-detail", v.id] });
      qc.invalidateQueries({ queryKey: ["exam-sections"] });
      qc.invalidateQueries({ queryKey: ["exams"] });
    },
  });
}

export function useAddResultComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }) => api.post(`/results/${id}/comment`, { comment }),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["result-detail", v.id] }),
  });
}

export function useReviewerSettings() {
  return useQuery({
    queryKey: ["result-reviewers"],
    queryFn: () => api.get("/results/settings/reviewers"),
  });
}

export function useUpdateReviewerSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roles) => api.put("/results/settings/reviewers", { roles }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["result-reviewers"] }),
  });
}

// ── edit requests ──
export function useEditRequests(params = {}, options = {}) {
  return useQuery({
    queryKey: ["edit-requests", params],
    queryFn: () => api.get("/edit-requests", { params }),
    ...options,
  });
}

export function useCreateEditRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/edit-requests", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["edit-requests"] });
      qc.invalidateQueries({ queryKey: ["exam-sections"] });
    },
  });
}

export function useDecideEditRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, note }) => api.post(`/edit-requests/${id}/decide`, { decision, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["edit-requests"] });
      qc.invalidateQueries({ queryKey: ["exam-sections"] });
      qc.invalidateQueries({ queryKey: ["exam-grades"] });
    },
  });
}
