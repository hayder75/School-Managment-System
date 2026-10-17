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
