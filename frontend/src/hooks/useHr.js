import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useHomeroom() {
  return useQuery({
    queryKey: ["hr-homeroom"],
    queryFn: () => api.get("/hr/homeroom"),
  });
}

export function useSetHomeroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, teacherId }) => api.put(`/hr/homeroom/${classId}`, { teacher_id: teacherId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-homeroom"] });
      qc.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}
