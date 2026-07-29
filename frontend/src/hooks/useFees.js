import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useFeeStructures(params = {}) {
  return useQuery({
    queryKey: ["fee-structures", params],
    queryFn: () => api.get("/fees/structures", { params }),
  });
}

export function useCreateFeeStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/fees/structures", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fee-structures"] }),
  });
}

export function useDeleteFeeStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/fees/structures/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fee-structures"] }),
  });
}

export function usePayments(params = {}) {
  return useQuery({
    queryKey: ["payments", params],
    queryFn: () => api.get("/fees/payments", { params }),
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/fees/payments", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["fee-summary"] });
    },
  });
}

export function usePaymentSummary() {
  return useQuery({
    queryKey: ["fee-summary"],
    queryFn: () => api.get("/fees/summary"),
  });
}
