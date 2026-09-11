import { useState, useEffect } from "react";
import { 
  UserCheck, Calendar, Clock, CheckCircle2, AlertCircle, 
  XCircle, Save, Filter, Search, UserMinus
} from "lucide-react";
import { Button } from "../components/ui/button";
import { EthiopianDateInput } from "../components/ui/EthiopianDateInput";

export default function TeacherAttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [staffList, setStaffList] = useState([]);
  const [stats, setStats] = useState({ totalStaff: 0, present: 0, late: 0, absent: 0, onLeave: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr-enhancements/teacher-attendance/summary?date=${selectedDate}`).then((r) => r.json());
      if (res.success) {
        setStaffList(res.data.staff || []);
        setStats(res.data.stats || {});
      }
    } catch (err) {
      console.error("Failed to load staff attendance", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (staffId, newStatus) => {
    setStaffList((prev) =>
      prev.map((item) => (item.staffId === staffId ? { ...item, status: newStatus } : item))
    );
  };

  const handleTimeChange = (staffId, field, value) => {
    setStaffList((prev) =>
      prev.map((item) => (item.staffId === staffId ? { ...item, [field]: value } : item))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = staffList.map((s) => ({
        staffId: s.staffId,
        status: s.status,
        checkIn: s.checkIn,
        checkOut: s.checkOut,
        notes: s.notes,
      }));

      const res = await fetch("/api/hr-enhancements/teacher-attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, records }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Teacher & Staff attendance saved successfully!");
        fetchAttendance();
      }
    } catch (err) {
      console.error("Failed to save attendance", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <UserCheck className="h-7 w-7 text-primary" /> Teacher & Staff Daily Attendance
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            HR register for tracking teacher punch-in times, absences, tardiness, and leave days.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2 shadow">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Attendance"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Staff</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalStaff || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <p className="text-xs font-medium text-emerald-600 uppercase">Present</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.present || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <p className="text-xs font-medium text-amber-600 uppercase">Late</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.late || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <p className="text-xs font-medium text-rose-600 uppercase">Absent</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{stats.absent || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <p className="text-xs font-medium text-blue-600 uppercase">On Leave</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.onLeave || 0}</p>
        </div>
      </div>

      {/* Date Picker Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Attendance Date:</span>
          <EthiopianDateInput className="w-56" value={selectedDate} onChange={setSelectedDate} />
        </div>
      </div>

      {/* Attendance Register Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3">Staff / Teacher</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Attendance Status</th>
                <th className="px-6 py-3">Check-In</th>
                <th className="px-6 py-3">Check-Out</th>
                <th className="px-6 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">Loading staff list...</td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No active teachers or staff members found.</td>
                </tr>
              ) : (
                staffList.map((item) => (
                  <tr key={item.staffId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {item.name}
                      <div className="text-xs text-gray-400 font-normal">{item.email}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 capitalize">{item.role}</td>
                    <td className="px-6 py-4">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.staffId, e.target.value)}
                        className={`border rounded-lg px-3 py-1 text-xs font-semibold focus:outline-none bg-white ${
                          item.status === "present"
                            ? "text-emerald-700 border-emerald-300 bg-emerald-50"
                            : item.status === "late"
                            ? "text-amber-700 border-amber-300 bg-amber-50"
                            : item.status === "absent"
                            ? "text-rose-700 border-rose-300 bg-rose-50"
                            : "text-blue-700 border-blue-300 bg-blue-50"
                        }`}
                      >
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                        <option value="half_day">Half Day</option>
                        <option value="on_leave">On Leave</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        placeholder="08:00"
                        value={item.checkIn || ""}
                        onChange={(e) => handleTimeChange(item.staffId, "checkIn", e.target.value)}
                        className="w-24 border rounded px-2 py-1 text-xs focus:outline-none"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        placeholder="16:30"
                        value={item.checkOut || ""}
                        onChange={(e) => handleTimeChange(item.staffId, "checkOut", e.target.value)}
                        className="w-24 border rounded px-2 py-1 text-xs focus:outline-none"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        placeholder="Remarks..."
                        value={item.notes || ""}
                        onChange={(e) => handleTimeChange(item.staffId, "notes", e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs focus:outline-none"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
