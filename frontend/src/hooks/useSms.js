import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useSmsStats() {
  return useQuery({ queryKey: ["sms", "stats"], queryFn: () => api.get("/sms/stats") });
}

export function useSmsConfig() {
  return useQuery({ queryKey: ["sms", "config"], queryFn: () => api.get("/sms/config") });
}

export function useUpdateSmsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.put("/sms/config", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms", "config"] });
      qc.invalidateQueries({ queryKey: ["sms", "stats"] });
    },
  });
}

export function useSmsCampaigns() {
  return useQuery({ queryKey: ["sms", "campaigns"], queryFn: () => api.get("/sms/campaigns") });
}

export function useSmsPreview(classId) {
  return useQuery({
    queryKey: ["sms", "preview", classId || "all"],
    queryFn: () => api.get("/sms/recipients/preview", { params: { class_id: classId || undefined } }),
  });
}

export function useSmsMessages(campaignId) {
  return useQuery({
    queryKey: ["sms", "messages", campaignId],
    queryFn: () => api.get(`/sms/campaigns/${campaignId}/messages`),
    enabled: !!campaignId,
  });
}

export function useCreateSmsCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/sms/campaigns", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms", "campaigns"] });
      qc.invalidateQueries({ queryKey: ["sms", "stats"] });
    },
  });
}

export function useCancelSmsCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/sms/campaigns/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms", "campaigns"] });
      qc.invalidateQueries({ queryKey: ["sms", "stats"] });
    },
  });
}

export function useProcessSms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/sms/process", data || {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms", "campaigns"] });
      qc.invalidateQueries({ queryKey: ["sms", "stats"] });
    },
  });
}