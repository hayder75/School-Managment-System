import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useClassTimetable(classId) {
  return useQuery({
    queryKey: ["timetable", "class", classId],
    queryFn: () => api.get(`/timetable/classes/${classId}`),
    enabled: !!classId,
  });
}

export function useTeacherTimetable(teacherId) {
  return useQuery({
    queryKey: ["timetable", "teacher", teacherId],
    queryFn: () => api.get(`/timetable/teachers/${teacherId}`),
    enabled: !!teacherId,
  });
}

export function useCreateTimetableEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/timetable", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timetable"] }),
  });
}

export function useDeleteTimetableEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/timetable/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timetable"] }),
  });
}
