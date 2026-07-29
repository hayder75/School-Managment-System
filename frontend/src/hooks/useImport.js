import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useImportData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, records }) => api.post("/import", { type, records }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}
