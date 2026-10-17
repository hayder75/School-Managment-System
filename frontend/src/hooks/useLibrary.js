import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

const invalidate = (qc) => {
  qc.invalidateQueries({ queryKey: ["library-books"] });
  qc.invalidateQueries({ queryKey: ["library-borrowings"] });
  qc.invalidateQueries({ queryKey: ["library-catalog"] });
  qc.invalidateQueries({ queryKey: ["library-my-borrowings"] });
};

export function useBooks(params = {}) {
  return useQuery({ queryKey: ["library-books", params], queryFn: () => api.get("/operations/books", { params }) });
}
export function useBookCategories() {
  return useQuery({ queryKey: ["library-categories"], queryFn: () => api.get("/operations/library/categories") });
}
export function useCreateBook() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => api.post("/operations/books", data), onSuccess: () => invalidate(qc) });
}
export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }) => api.put(`/operations/books/${id}`, data), onSuccess: () => invalidate(qc) });
}
export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => api.delete(`/operations/books/${id}`), onSuccess: () => invalidate(qc) });
}
export function useLibrarySettings() {
  return useQuery({ queryKey: ["library-settings"], queryFn: () => api.get("/operations/library/settings") });
}
export function useUpdateLibrarySettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => api.put("/operations/library/settings", data), onSuccess: () => qc.invalidateQueries({ queryKey: ["library-settings"] }) });
}
export function useBorrowings(params = {}) {
  return useQuery({ queryKey: ["library-borrowings", params], queryFn: () => api.get("/operations/books/borrowings", { params }) });
}
export function useBorrowBook() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => api.post("/operations/books/borrow", data), onSuccess: () => invalidate(qc) });
}
export function useReturnBook() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, condition }) => api.patch(`/operations/books/return/${id}`, { condition }), onSuccess: () => invalidate(qc) });
}
export function useLibraryCatalog(params = {}) {
  return useQuery({ queryKey: ["library-catalog", params], queryFn: () => api.get("/operations/library/catalog", { params }) });
}
export function useMyBorrowings() {
  return useQuery({ queryKey: ["library-my-borrowings"], queryFn: () => api.get("/operations/library/my-borrowings") });
}
export function useLibraryStats() {
  return useQuery({ queryKey: ["library-stats"], queryFn: () => api.get("/operations/library/stats"), staleTime: 60_000 });
}
export function useLibraryInventory() {
  return useQuery({ queryKey: ["library-inventory"], queryFn: () => api.get("/operations/library/inventory"), staleTime: 30_000 });
}
export function useAssessments(params = {}) {
  return useQuery({ queryKey: ["library-assessments", params], queryFn: () => api.get("/operations/library/assessments", { params }) });
}
export function useCreateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/operations/library/assessments", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library-inventory"] });
      qc.invalidateQueries({ queryKey: ["library-assessments"] });
      qc.invalidateQueries({ queryKey: ["library-books"] });
      qc.invalidateQueries({ queryKey: ["library-stats"] });
    },
  });
}
