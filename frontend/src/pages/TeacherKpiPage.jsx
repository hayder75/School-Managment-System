import { useState, useEffect } from "react";
import { 
  Award, Star, TrendingUp, CheckCircle, UserCheck, 
  Search, Plus, BookOpen, Clock, ThumbsUp, X
} from "lucide-react";
import { Button } from "../components/ui/button";

export default function TeacherKpiPage() {
  const [summary, setSummary] = useState(null);
  const [kpiList, setKpiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    teacherId: "",
    periodName: "Q1 2026",
    attendanceRate: 95.0,
    punctualityRate: 98.0,
    substitutionsCovered: 2,
    studentFeedbackScore: 4.8,
    syllabusCompletionRate: 92.0,
    comments: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resKpis, resSummary] = await Promise.all([
        fetch("/api/hr-enhancements/teacher-kpis").then((r) => r.json()),
        fetch("/api/hr-enhancements/teacher-kpis/summary").then((r) => r.json()),
      ]);

      if (resKpis.success) setKpiList(resKpis.data);
      if (resSummary.success) setSummary(resSummary.data);
    } catch (err) {
      console.error("Failed to load KPI metrics", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setFormData({
        teacherId: item.teacher_id,
        periodName: item.period_name,
        attendanceRate: item.attendance_rate,
        punctualityRate: item.punctuality_rate,
        substitutionsCovered: item.substitutions_covered,
        studentFeedbackScore: item.student_feedback_score,
        syllabusCompletionRate: item.syllabus_completion_rate,
        comments: item.comments || "",
      });
    } else {
      setFormData({
        teacherId: summary?.teachers?.[0]?.id || "",
        periodName: "Q1 2026",
        attendanceRate: 95.0,
        punctualityRate: 98.0,
        substitutionsCovered: 2,
        studentFeedbackScore: 4.8,
        syllabusCompletionRate: 92.0,
        comments: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.teacherId) {
      alert("Please select a teacher.");
      return;
    }

    try {
      const res = await fetch("/api/hr-enhancements/teacher-kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to save KPI evaluation", err);
    }
  };

  const getRatingBadge = (rating) => {
    const num = parseFloat(rating || 0);
    if (num >= 4.5) return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">★ {num.toFixed(2)} (Excellent)</span>;
    if (num >= 3.5) return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">★ {num.toFixed(2)} (Good)</span>;
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">★ {num.toFixed(2)} (Needs Work)</span>;
  };

  const filteredList = kpiList.filter((k) =>
    (k.teacher_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (k.period_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Award className="h-7 w-7 text-primary" /> Teacher KPI Metrics & Performance Scorecards
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            HR analytics evaluating teacher punctuality, attendance rates, syllabus completion, coverage, and student feedback.
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2 shadow">
          <Plus className="w-4 h-4" /> Evaluate Teacher
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Overall Score</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {summary?.averages?.avg_rating || "4.50"} / 5.0
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-amber-500">
            <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Attendance Rate</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {summary?.averages?.avg_attendance || "96.5"}%
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Student Rating</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {summary?.averages?.avg_feedback || "4.6"} / 5.0
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <ThumbsUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cover Shifts</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">
              {summary?.averages?.total_substitutions || 0} Shifts
            </p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search teacher name or period..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* KPI Evaluation Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3">Teacher</th>
                <th className="px-6 py-3">Evaluation Period</th>
                <th className="px-6 py-3 text-center">Attendance %</th>
                <th className="px-6 py-3 text-center">Punctuality %</th>
                <th className="px-6 py-3 text-center">Syllabus %</th>
                <th className="px-6 py-3 text-center">Student Rating</th>
                <th className="px-6 py-3 text-center">Substitutions Covered</th>
                <th className="px-6 py-3 text-right">Overall Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">Loading KPI scorecards...</td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">No KPI evaluations found. Click "Evaluate Teacher" to add one.</td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {item.teacher_name}
                      <div className="text-xs text-gray-400 font-normal">{item.teacher_email}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{item.period_name}</td>
                    <td className="px-6 py-4 text-center font-medium text-emerald-700">{item.attendance_rate}%</td>
                    <td className="px-6 py-4 text-center font-medium text-emerald-700">{item.punctuality_rate}%</td>
                    <td className="px-6 py-4 text-center font-medium text-blue-700">{item.syllabus_completion_rate}%</td>
                    <td className="px-6 py-4 text-center font-semibold text-amber-600">★ {parseFloat(item.student_feedback_score || 0).toFixed(1)}</td>
                    <td className="px-6 py-4 text-center font-medium text-indigo-700">{item.substitutions_covered}</td>
                    <td className="px-6 py-4 text-right">{getRatingBadge(item.overall_rating)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Evaluate Teacher KPI Scorecard
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Select Teacher</label>
                <select
                  required
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                >
                  <option value="">-- Choose Teacher --</option>
                  {summary?.teachers?.map((t) => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Evaluation Period</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q1 2026 or August 2026"
                  value={formData.periodName}
                  onChange={(e) => setFormData({ ...formData, periodName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Attendance Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.attendanceRate}
                    onChange={(e) => setFormData({ ...formData, attendanceRate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Punctuality Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.punctualityRate}
                    onChange={(e) => setFormData({ ...formData, punctualityRate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Syllabus Progress (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.syllabusCompletionRate}
                    onChange={(e) => setFormData({ ...formData, syllabusCompletionRate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Student Rating (1-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={formData.studentFeedbackScore}
                    onChange={(e) => setFormData({ ...formData, studentFeedbackScore: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Substitutions Covered</label>
                <input
                  type="number"
                  min="0"
                  value={formData.substitutionsCovered}
                  onChange={(e) => setFormData({ ...formData, substitutionsCovered: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Evaluator Comments</label>
                <textarea
                  rows="2"
                  placeholder="Strengths, achievements, or feedback..."
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save KPI Scorecard
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
