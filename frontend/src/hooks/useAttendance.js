import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useAttendance(classId, date) {
  return useQuery({
    queryKey: ["attendance", classId, date],
    queryFn: () => api.get(`/attendance/classes/${classId}`, { params: { date } }),
    enabled: !!classId && !!date,
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, date, records }) =>
      api.post(`/attendance/classes/${classId}`, { date, records }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useAdminAttendanceOverview(params = {}) {
  return useQuery({
    queryKey: ["attendance-admin-overview", params],
    queryFn: () => api.get("/attendance/admin/overview", { params }),
  });
}

export function useAdminClassAttendance(classId, params = {}) {
  return useQuery({
    queryKey: ["attendance-admin-class", classId, params],
    queryFn: () => api.get(`/attendance/admin/classes/${classId}`, { params }),
    enabled: !!classId,
  });
}

export function useTeacherAttendanceOverview(params = {}) {
  return useQuery({
    queryKey: ["attendance-teacher-overview", params],
    queryFn: () => api.get("/attendance/teacher/overview", { params }),
  });
}

export function useClassAttendanceStats(classId, params = {}) {
  return useQuery({
    queryKey: ["attendance-class-stats", classId, params],
    queryFn: () => api.get(`/attendance/classes/${classId}/stats`, { params }),
    enabled: !!classId,
  });
}
