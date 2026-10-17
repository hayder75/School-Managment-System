import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useHomeroom() {
  return useQuery({
    queryKey: ["hr-homeroom"],
    queryFn: () => api.get("/hr-enhancements/homeroom"),
  });
}

export function useSetHomeroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, teacherId }) => api.put(`/hr-enhancements/homeroom/${classId}`, { teacher_id: teacherId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-homeroom"] });
      qc.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function useOvertime(filters = {}) {
  return useQuery({
    queryKey: ["hr-overtime", filters],
    queryFn: () => api.get("/hr-enhancements/overtime", { params: filters }),
  });
}

export function useOvertimeSummary(month) {
  return useQuery({
    queryKey: ["hr-overtime-summary", month],
    queryFn: () => api.get("/hr-enhancements/overtime/summary", { params: { month } }),
  });
}

export function useOvertimeSettings() {
  return useQuery({
    queryKey: ["hr-overtime-settings"],
    queryFn: () => api.get("/hr-enhancements/overtime/settings"),
  });
}

export function useCreateOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/hr-enhancements/overtime", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-overtime"] });
      qc.invalidateQueries({ queryKey: ["hr-overtime-summary"] });
    },
  });
}

export function useUpdateOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/hr-enhancements/overtime/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-overtime"] });
      qc.invalidateQueries({ queryKey: ["hr-overtime-summary"] });
    },
  });
}

export function useApproveOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.patch(`/hr-enhancements/overtime/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-overtime"] });
      qc.invalidateQueries({ queryKey: ["hr-overtime-summary"] });
    },
  });
}

export function useDeleteOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/hr-enhancements/overtime/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-overtime"] });
      qc.invalidateQueries({ queryKey: ["hr-overtime-summary"] });
    },
  });
}

export function useUpdateOvertimeSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.put("/hr-enhancements/overtime/settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-overtime-settings"] });
      qc.invalidateQueries({ queryKey: ["hr-overtime"] });
      qc.invalidateQueries({ queryKey: ["hr-overtime-summary"] });
    },
  });
}

export function useStaffList() {
  return useQuery({
    queryKey: ["hr-staff-directory"],
    queryFn: () => api.get("/reports/staff-directory"),
  });
}
