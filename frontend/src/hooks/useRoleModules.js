import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

// ---------- Quality / Academic content ----------
export function useSubmissions(params = {}) {
  return useQuery({ queryKey: ["submissions", params], queryFn: () => api.get("/academic-content", { params }) });
}
export function useSubmission(id) {
  return useQuery({ queryKey: ["submission", id], queryFn: () => api.get(`/academic-content/${id}`), enabled: !!id });
}
export function useSubmissionSummary() {
  return useQuery({ queryKey: ["submission-summary"], queryFn: () => api.get("/academic-content/summary") });
}
export function useMaterialsBank(params = {}) {
  return useQuery({ queryKey: ["materials-bank", params], queryFn: () => api.get("/academic-content/bank", { params }) });
}
export function useCreateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/academic-content", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submissions"] }),
  });
}
export function useUpdateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/academic-content/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submissions"] }),
  });
}
export function useDeleteSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/academic-content/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submissions"] }),
  });
}
export function useReviewSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.post(`/academic-content/${id}/review`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      qc.invalidateQueries({ queryKey: ["materials-bank"] });
      qc.invalidateQueries({ queryKey: ["submission-summary"] });
      qc.invalidateQueries({ queryKey: ["submission"] });
    },
  });
}
export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }) => api.post(`/academic-content/${id}/comments`, { comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submission"] }),
  });
}
export function useToggleBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, banked }) => api.post(`/academic-content/${id}/bank`, { banked }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials-bank"] }),
  });
}
export function useTeacherKpis(params = {}) {
  return useQuery({ queryKey: ["teacher-kpis-all", params], queryFn: () => api.get("/hr-enhancements/teacher-kpis", { params }) });
}

// ---------- Security ----------
export function useVisitors(params = {}) {
  return useQuery({ queryKey: ["visitors", params], queryFn: () => api.get("/security/visitors", { params }) });
}
export function useCreateVisitor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => api.post("/security/visitors", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["visitors"] }) });
}
export function useCheckoutVisitor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => api.post(`/security/visitors/${id}/checkout`), onSuccess: () => qc.invalidateQueries({ queryKey: ["visitors"] }) });
}
export function useGatePasses(params = {}) {
  return useQuery({ queryKey: ["gate-passes", params], queryFn: () => api.get("/security/gate-passes", { params }) });
}
export function useCreateGatePass() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => api.post("/security/gate-passes", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["gate-passes"] }) });
}
export function useVerifyGatePass() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (pass_code) => api.post("/security/gate-passes/verify", { pass_code }), onSuccess: () => qc.invalidateQueries({ queryKey: ["gate-passes"] }) });
}
export function useIncidents(params = {}) {
  return useQuery({ queryKey: ["incidents", params], queryFn: () => api.get("/security/incidents", { params }) });
}
export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => api.post("/security/incidents", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["incidents"] }) });
}
export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...d }) => api.put(`/security/incidents/${id}`, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["incidents"] }) });
}

// ---------- Facilities ----------
export function useMaintenance(params = {}) {
  return useQuery({ queryKey: ["maintenance", params], queryFn: () => api.get("/facilities/maintenance", { params }) });
}
export function useMaintenanceSummary() {
  return useQuery({ queryKey: ["maintenance-summary"], queryFn: () => api.get("/facilities/maintenance/summary") });
}
export function useCreateMaintenance() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => api.post("/facilities/maintenance", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance"] }) });
}
export function useUpdateMaintenance() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...d }) => api.put(`/facilities/maintenance/${id}`, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance"] }) });
}
export function usePurchases(params = {}) {
  return useQuery({ queryKey: ["purchases", params], queryFn: () => api.get("/facilities/purchases", { params }) });
}
export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => api.post("/facilities/purchases", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["purchases"] }) });
}
export function useDecidePurchase() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...d }) => api.post(`/facilities/purchases/${id}/decide`, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["purchases"] }) });
}

// ---------- Accounting ----------
export function useDailyCollections(params = {}) {
  return useQuery({ queryKey: ["daily-collections", params], queryFn: () => api.get("/accounting/daily-collections", { params }) });
}
export function useReconcileDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/accounting/reconcile", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-collections"] });
      qc.invalidateQueries({ queryKey: ["reconciliation-batches"] });
    },
  });
}
export function useReconciliationBatches(params = {}) {
  return useQuery({ queryKey: ["reconciliation-batches", params], queryFn: () => api.get("/accounting/batches", { params }) });
}
export function useDefaulterAging(params = {}) {
  return useQuery({ queryKey: ["defaulter-aging", params], queryFn: () => api.get("/accounting/defaulter-aging", { params }) });
}
export function useMonthlyClose(params = {}) {
  return useQuery({ queryKey: ["monthly-close", params], queryFn: () => api.get("/accounting/monthly-close", { params }) });
}

// ---------- Executive ----------
export function useExecutiveKpis() {
  return useQuery({ queryKey: ["executive-kpis"], queryFn: () => api.get("/executive/kpis") });
}
export function useExecutiveTrend(params = {}) {
  return useQuery({ queryKey: ["executive-trend", params], queryFn: () => api.get("/executive/trend", { params }) });
}
export function usePendingExpenses() {
  return useQuery({ queryKey: ["pending-expenses-gm"], queryFn: () => api.get("/executive/expenses/pending") });
}
export function useDecideExpenseGM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...d }) => api.post(`/executive/expenses/${id}/decide`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-expenses-gm"] });
      qc.invalidateQueries({ queryKey: ["executive-kpis"] });
    },
  });
}
export function usePendingPayrolls() {
  return useQuery({ queryKey: ["pending-payrolls-gm"], queryFn: () => api.get("/executive/payrolls/pending") });
}
export function useDecidePayrollGM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...d }) => api.post(`/executive/payrolls/${id}/decide`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-payrolls-gm"] });
      qc.invalidateQueries({ queryKey: ["executive-kpis"] });
    },
  });
}

// ---------- Discipline ----------
export function useDisciplineCases(params = {}) {
  return useQuery({ queryKey: ["discipline", params], queryFn: () => api.get("/discipline", { params }) });
}
export function useCreateDisciplineCase() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d) => api.post("/discipline", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["discipline"] }) });
}
export function useResolveDisciplineCase() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...d }) => api.post(`/discipline/${id}/resolve`, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["discipline"] }) });
}
