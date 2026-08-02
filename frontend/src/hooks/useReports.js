import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

export function useClassReport(classId) {
  return useQuery({
    queryKey: ["report-class", classId],
    queryFn: () => api.get(`/reports/classes/${classId}`),
    enabled: !!classId,
  });
}

export function useEnrollmentReport(params = {}) {
  return useQuery({
    queryKey: ["report-enrollment", params],
    queryFn: () => api.get("/reports/enrollment", { params }),
  });
}

export function useGradeDistribution(params = {}) {
  return useQuery({
    queryKey: ["report-grade-dist", params],
    queryFn: () => api.get("/reports/grade-distribution", { params }),
  });
}

export function useClassPerformance(params = {}) {
  return useQuery({
    queryKey: ["report-class-perf", params],
    queryFn: () => api.get("/reports/class-performance", { params }),
  });
}

export function useAttendanceOverview(params = {}) {
  return useQuery({
    queryKey: ["report-attendance-ov", params],
    queryFn: () => api.get("/reports/attendance-overview", { params }),
  });
}

export function useTeacherWorkload() {
  return useQuery({
    queryKey: ["report-teacher-wl"],
    queryFn: () => api.get("/reports/teacher-workload"),
  });
}

export function useMyStudents(params = {}) {
  return useQuery({
    queryKey: ["report-my-students", params],
    queryFn: () => api.get("/reports/my-students", { params }),
  });
}

export function useMyAttendance(params = {}) {
  return useQuery({
    queryKey: ["report-my-attendance", params],
    queryFn: () => api.get("/reports/my-attendance", { params }),
  });
}

export function useMyGrades(params = {}) {
  return useQuery({
    queryKey: ["report-my-grades", params],
    queryFn: () => api.get("/reports/my-grades", { params }),
  });
}

export function useFeeCollection(params = {}) {
  return useQuery({
    queryKey: ["report-fee-collection", params],
    queryFn: () => api.get("/reports/fee-collection", { params }),
  });
}

export function useOutstandingBalances(params = {}) {
  return useQuery({
    queryKey: ["report-outstanding", params],
    queryFn: () => api.get("/reports/outstanding", { params }),
  });
}

export function useRevenueVsExpenses(params = {}) {
  return useQuery({
    queryKey: ["report-rev-exp", params],
    queryFn: () => api.get("/reports/revenue-expenses", { params }),
  });
}

export function useStaffDirectory(params = {}) {
  return useQuery({
    queryKey: ["report-staff-dir", params],
    queryFn: () => api.get("/reports/staff-directory", { params }),
  });
}

export function usePayrollSummary(params = {}) {
  return useQuery({
    queryKey: ["report-payroll-sum", params],
    queryFn: () => api.get("/reports/payroll-summary", { params }),
  });
}

export function useHeadcount() {
  return useQuery({
    queryKey: ["report-headcount"],
    queryFn: () => api.get("/reports/headcount"),
  });
}

export function useStudentGradeSummary(studentId) {
  return useQuery({
    queryKey: ["report-student-grades", studentId],
    queryFn: () => api.get(`/reports/students/${studentId}/grades`),
    enabled: !!studentId,
  });
}

export function useStudentAttendanceSummary(studentId, params = {}) {
  return useQuery({
    queryKey: ["report-student-att", studentId, params],
    queryFn: () => api.get(`/reports/students/${studentId}/attendance`, { params }),
    enabled: !!studentId,
  });
}
