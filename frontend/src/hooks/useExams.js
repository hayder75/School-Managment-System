import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useExams(params = {}) {
  return useQuery({
    queryKey: ["exams", params],
    queryFn: () => api.get("/exams", { params }),
  });
}

export function useCreateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/exams", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/exams/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}
