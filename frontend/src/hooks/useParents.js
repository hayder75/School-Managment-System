import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useParents(params = {}) {
  return useQuery({
    queryKey: ["parents", params],
    queryFn: () => api.get("/parents", { params }),
  });
}

export function useParent(id) {
  return useQuery({
    queryKey: ["parents", id],
    queryFn: () => api.get(`/parents/${id}`),
    enabled: !!id,
  });
}

export function useLinkParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/parents/link", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parents"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useUnlinkParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/parents/link/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parents"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useUpdateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/parents/link/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parents"] });
      qc.invalidateQueries({ queryKey: ["my-children"] });
    },
  });
}

export function useMyChildren(options = {}) {
  return useQuery({
    queryKey: ["my-children"],
    queryFn: () => api.get("/parents/my-children"),
    ...options,
  });
}
