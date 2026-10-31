import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

function invalidateExam(qc, examId) {
  qc.invalidateQueries({ queryKey: ["exams"] });
  qc.invalidateQueries({ queryKey: ["grades", "exam-classes", examId] });
  qc.invalidateQueries({ queryKey: ["grades", "exam", examId] });
  qc.invalidateQueries({ queryKey: ["exam-sections", examId] });
  qc.invalidateQueries({ queryKey: ["exam-draft", examId] });
}

export function useExams(params = {}) {
  return useQuery({
    queryKey: ["exams", params],
    queryFn: () => api.get("/exams", { params }),
  });
}

export function useCreateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/exams", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function useUpdateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/exams/${id}`, data),
    onSuccess: (_, variables) => invalidateExam(qc, variables.id),
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, force }) => api.delete(`/exams/${id}`, { params: force ? { force: true } : {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function useArchiveExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/exams/${id}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function useRestoreExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/exams/${id}/restore`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}

// ── sections + approval status ──
export function useExamSections(examId, options = {}) {
  return useQuery({
    queryKey: ["exam-sections", examId],
    queryFn: () => api.get("/results/sections", { params: { exam_id: examId } }),
    enabled: !!examId,
    ...options,
  });
}

export function useSubmitResults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/results/submit", data),
    onSuccess: (_, variables) => invalidateExam(qc, variables.exam_id),
  });
}

// ── assessment types ──
export function useAssessmentTypes(params = {}) {
  return useQuery({
    queryKey: ["assessment-types", params],
    queryFn: () => api.get("/assessment-types", { params }),
    staleTime: 5 * 60_000,
  });
}

export function useCreateAssessmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/assessment-types", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assessment-types"] }),
  });
}

export function useUpdateAssessmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/assessment-types/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assessment-types"] }),
  });
}

export function useDeleteAssessmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/assessment-types/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assessment-types"] }),
  });
}

// ── grading scheme ──
export function useGradingScheme() {
  return useQuery({
    queryKey: ["grading-scheme"],
    queryFn: () => api.get("/grading-scheme"),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateGradingScheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.put("/grading-scheme", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grading-scheme"] }),
  });
}

// ── server-side autosave drafts ──
export function useExamDraft(examId, classId) {
  return useQuery({
    queryKey: ["exam-draft", examId, classId],
    queryFn: () => api.get(`/grades/drafts/${examId}/${classId}`),
    enabled: !!examId && !!classId,
    staleTime: 0,
  });
}

export function useSaveExamDraft() {
  return useMutation({
    mutationFn: ({ examId, classId, payload }) => api.put(`/grades/drafts/${examId}/${classId}`, { payload }),
  });
}

export function useClearExamDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, classId }) => api.delete(`/grades/drafts/${examId}/${classId}`),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["exam-draft", v.examId, v.classId] }),
  });
}
