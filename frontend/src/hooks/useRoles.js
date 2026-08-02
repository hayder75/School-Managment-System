import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get("/roles"),
  });
}

export function useRolePermissions() {
  return useQuery({
    queryKey: ["role-permissions"],
    queryFn: () => api.get("/roles/permissions"),
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/roles", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/roles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });
}

export function useUserRoles(userId) {
  return useQuery({
    queryKey: ["user-roles", userId],
    queryFn: () => api.get(`/roles/users/${userId}`),
    enabled: !!userId,
  });
}

export function useSetUserRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...data }) => api.put(`/roles/users/${userId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-roles"] });
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}
