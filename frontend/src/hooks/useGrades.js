import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useExamGrades(examId, classId) {
  return useQuery({
    queryKey: ["grades", "exam", examId, classId || "default"],
    queryFn: () => api.get(`/grades/exams/${examId}`, { params: classId ? { class_id: classId } : {} }),
    enabled: !!examId,
  });
}

export function useExamClasses(examId) {
  return useQuery({
    queryKey: ["grades", "exam-classes", examId],
    queryFn: () => api.get(`/grades/exams/${examId}/classes`),
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

export function useStudentGrades(studentId) {
  return useQuery({
    queryKey: ["grades", "student", studentId],
    queryFn: () => api.get(`/grades/students/${studentId}`),
    enabled: !!studentId,
  });
}
