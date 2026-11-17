import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useClasses(params = {}) {
  return useQuery({
    queryKey: ["classes", params],
    queryFn: () => api.get("/classes", { params }),
  });
}

export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/classes", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });
}

export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/classes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });
}

export function useSetHomeroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, class_teacher_id }) => api.put(`/classes/${id}/homeroom`, { class_teacher_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });
}

export function useClassSupportStaff(classId) {
  return useQuery({
    queryKey: ["class-support-staff", classId],
    queryFn: () => api.get(`/classes/${classId}/support-staff`),
    enabled: !!classId,
  });
}

export function useAddClassSupportStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, userId, canMarkAttendance = true, canEnterMarks = true }) =>
      api.post(`/classes/${classId}/support-staff`, {
        user_id: userId,
        can_mark_attendance: canMarkAttendance,
        can_enter_marks: canEnterMarks,
      }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["class-support-staff", v.classId] });
      qc.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function useRemoveClassSupportStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, userId }) => api.delete(`/classes/${classId}/support-staff/${userId}`),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["class-support-staff", v.classId] });
      qc.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}
