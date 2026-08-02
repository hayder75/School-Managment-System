import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useSalaryGrades() {
  return useQuery({
    queryKey: ["salary-grades"],
    queryFn: () => api.get("/payroll/grades"),
  });
}

export function useCreateSalaryGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/payroll/grades", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salary-grades"] }),
  });
}

export function useDeleteSalaryGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/payroll/grades/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salary-grades"] }),
  });
}

export function usePayroll(params = {}) {
  return useQuery({
    queryKey: ["payroll", params],
    queryFn: () => api.get("/payroll", { params }),
  });
}

export function useCreatePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/payroll", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payroll"] }),
  });
}

export function useCalculatePayroll() {
  return useMutation({
    mutationFn: (data) => api.post("/payroll/calculate", data),
  });
}

export function usePayrollSummary(month, year) {
  return useQuery({
    queryKey: ["payroll-summary", month, year],
    queryFn: () => api.get("/payroll/summary", { params: { month, year } }),
    enabled: !!month && !!year,
  });
}
