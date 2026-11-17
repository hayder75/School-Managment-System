import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useMarkSheetOverview(termId) {
  return useQuery({
    queryKey: ["mark-sheets", "overview", termId || "all"],
    queryFn: () => api.get("/mark-sheets/overview", { params: termId ? { term_id: termId } : {} }),
    staleTime: 30 * 1000,
  });
}

export function useMarkSheet(classId, subjectId, termId) {
  return useQuery({
    queryKey: ["mark-sheet", classId, subjectId, termId],
    queryFn: () => api.get("/mark-sheets", { params: { class_id: classId, subject_id: subjectId, term_id: termId } }),
    enabled: !!classId && !!subjectId && !!termId,
  });
}

export function useSaveMarkSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cells, fillBlanks }) =>
      api.post(`/mark-sheets/${id}/save`, { cells, fill_blanks: !!fillBlanks }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mark-sheet"] });
      qc.invalidateQueries({ queryKey: ["mark-sheets", "overview"] });
    },
  });
}

export function useSubmitMarkSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => api.post(`/mark-sheets/${id}/submit`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mark-sheet"] });
      qc.invalidateQueries({ queryKey: ["mark-sheets", "overview"] });
    },
  });
}

export function useReviewMarkSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, comment }) =>
      api.post(`/mark-sheets/${id}/review`, { decision, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mark-sheet"] });
      qc.invalidateQueries({ queryKey: ["mark-sheets", "overview"] });
    },
  });
}

export function useUpdateSheetConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, config }) => api.put(`/mark-sheets/${id}/config`, { config }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mark-sheet"] }),
  });
}

export function useAssessmentTemplates(params = {}) {
  return useQuery({
    queryKey: ["assessment-templates", params],
    queryFn: () => api.get("/mark-sheets/templates", { params }),
    staleTime: 60 * 1000,
  });
}

export function useSaveAssessmentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => (data.id
      ? api.put(`/mark-sheets/templates/${data.id}`, data)
      : api.post("/mark-sheets/templates", data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessment-templates"] });
      qc.invalidateQueries({ queryKey: ["mark-sheet"] });
    },
  });
}

export function useDeleteAssessmentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/mark-sheets/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assessment-templates"] }),
  });
}
