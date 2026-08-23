import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useGuardShiftsList(params = {}) {
  return useQuery({ queryKey: ["guard-shifts", params], queryFn: () => api.get("/shifts/guard-shifts", { params }) });
}

export function useCreateGuardShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/shifts/guard-shifts", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guard-shifts"] }),
  });
}

export function useDeleteGuardShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/shifts/guard-shifts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guard-shifts"] }),
  });
}

export function useShiftReports() {
  return useQuery({ queryKey: ["shift-reports"], queryFn: () => api.get("/shifts/reports") });
}

export function useSubstitutions(params = {}) {
  return useQuery({ queryKey: ["substitutions", params], queryFn: () => api.get("/shifts/substitutions", { params }) });
}
