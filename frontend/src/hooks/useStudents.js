import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useStudents(params = {}, options = {}) {
  return useQuery({
    queryKey: ["students", params],
    queryFn: () => api.get("/students", { params }),
    ...options,
  });
}

export function useStudent(id) {
  return useQuery({
    queryKey: ["students", id],
    queryFn: () => api.get(`/students/${id}`),
    enabled: !!id,
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
