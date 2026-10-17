import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../lib/api";

export function useOverview(filters = {}) {
  return useQuery({
    queryKey: ["report-overview", filters],
    queryFn: () => api.get("/reports/overview", { params: filters }),
    staleTime: 60_000,
  });
}

export function useReportCatalog() {
  return useQuery({
    queryKey: ["report-catalog"],
    queryFn: () => api.get("/reports/catalog"),
    staleTime: 30 * 60_000,
  });
}

export function useReport(reportId, filters = {}) {
  return useQuery({
    queryKey: ["report", reportId, filters],
    queryFn: () => api.get(`/reports/report/${reportId}`, { params: filters }),
    enabled: !!reportId,
    staleTime: 60_000,
  });
}

export function useReportDetail(reportId, filters = {}, { table, page = 1, search } = {}) {
  return useQuery({
    queryKey: ["report-detail", reportId, filters, table, page, search],
    queryFn: () => api.get(`/reports/detail/${reportId}`, {
      params: { ...filters, table: table || undefined, page, limit: 25, search: search || undefined },
    }),
    enabled: !!reportId,
    staleTime: 60_000,
  });
}

export function useCreateReportShare() {
  return useMutation({
    mutationFn: (data) => api.post("/reports/share", data),
  });
}

export function useMyReportShares(options = {}) {
  return useQuery({
    queryKey: ["report-shares"],
    queryFn: () => api.get("/reports/shares"),
    ...options,
  });
}

export function useRevokeReportShare() {
  return useMutation({
    mutationFn: (id) => api.delete(`/reports/shares/${id}`),
  });
}
