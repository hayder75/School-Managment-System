import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function usePerformanceCriteria() {
  return useQuery({
    queryKey: ["performance-criteria"],
    queryFn: () => api.get("/performance/criteria"),
  });
}

export function useCreateCriteria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/performance/criteria", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["performance-criteria"] }),
  });
}

export function useUpdateCriteria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/performance/criteria/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["performance-criteria"] }),
  });
}

export function useDeleteCriteria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/performance/criteria/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["performance-criteria"] }),
  });
}

export function usePerformanceScores(params = {}) {
  return useQuery({
    queryKey: ["performance-scores", params],
    queryFn: () => api.get("/performance/scores", { params }),
  });
}
