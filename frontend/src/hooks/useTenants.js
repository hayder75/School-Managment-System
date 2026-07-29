import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useTenants(params = {}) {
  return useQuery({
    queryKey: ["tenants", params],
    queryFn: () => api.get("/admin/tenants", { params }),
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/admin/tenants", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenants"] }),
  });
}

export function useTenant(id) {
  return useQuery({
    queryKey: ["tenants", id],
    queryFn: () => api.get(`/admin/tenants/${id}`),
    enabled: !!id,
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.put(`/admin/tenants/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useSystemStats() {
  return useQuery({
    queryKey: ["system-stats"],
    queryFn: () => api.get("/admin/tenants/stats"),
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/admin/tenants/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenants"] }),
  });
}
