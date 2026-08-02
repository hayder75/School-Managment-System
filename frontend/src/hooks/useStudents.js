import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useStudents(params = {}, options = {}) {
  return useQuery({
    queryKey: ["students", params],
    queryFn: () => api.get("/students", { params }),
    ...options,
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/students", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/students/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/students/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students"] }),
  });
}

export function useStudentsByClass(classId) {
  return useQuery({
    queryKey: ["students", "class", classId],
    queryFn: () => api.get(`/students/class/${classId}`),
    enabled: !!classId,
  });
}

export function usePromoteStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/students/promote", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["enrollment-stats"] });
    },
  });
}

export function useEnrollmentStats() {
  return useQuery({
    queryKey: ["enrollment-stats"],
    queryFn: () => api.get("/students/enrollment-stats"),
  });
}

export function useStudentEnrollments(studentId) {
  return useQuery({
    queryKey: ["students", studentId, "enrollments"],
    queryFn: () => api.get(`/students/${studentId}/enrollments`),
    enabled: !!studentId,
  });
}

export function useCreateStudentEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, data }) => api.post(`/students/${studentId}/enrollments`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["enrollment-stats"] });
    },
  });
}

export function useUpdateStudentEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, enrollmentId, data }) => api.put(`/students/${studentId}/enrollments/${enrollmentId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["enrollment-stats"] });
    },
  });
}

export function useDeleteStudentEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, enrollmentId }) => api.delete(`/students/${studentId}/enrollments/${enrollmentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["enrollment-stats"] });
    },
  });
}
