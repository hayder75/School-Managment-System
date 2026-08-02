import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useExamGrades(examId) {
  return useQuery({
    queryKey: ["grades", "exam", examId],
    queryFn: () => api.get(`/grades/exams/${examId}`),
    enabled: !!examId,
  });
}

export function useEnterGrades() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, grades }) =>
      api.post(`/grades/exams/${examId}`, { grades }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grades"] }),
  });
}
