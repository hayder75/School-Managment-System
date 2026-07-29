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
