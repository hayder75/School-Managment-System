import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useTeachers(params = {}) {
  return useQuery({
    queryKey: ["teachers", params],
    queryFn: () => api.get("/teachers", { params }),
  });
}

export function useTeacherAssignments(teacherId) {
  return useQuery({
    queryKey: ["teacher-assignments", teacherId],
    queryFn: () => api.get(`/teachers/${teacherId}/assignments`),
    enabled: !!teacherId,
  });
}

export function useAssignSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teacherId, ...data }) =>
      api.post(`/teachers/${teacherId}/assignments`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher-assignments"] }),
  });
}

export function useRemoveAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teacherId, assignmentId }) =>
      api.delete(`/teachers/${teacherId}/assignments/${assignmentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher-assignments"] }),
  });
}
