import { useState, useEffect } from "react";
import {
  Package, Plus, Search, Filter, Edit2, Trash2, CheckCircle2,
  AlertTriangle, Wrench, Building, X, DollarSign, FileText, History, Archive, Download, ClipboardCheck
} from "lucide-react";
import { Button } from "../components/ui/button";

function exportCsv(rows) {
  const header = ["Asset Code", "Name", "Category", "Location", "Qty", "Counted Qty", "Unit Cost", "Total Cost", "Condition", "Status", "Purchase Date"];
  const lines = rows.map((a) => [
    a.asset_code, `"${String(a.name).replace(/"/g, '""')}"`, a.category,
    `"${(a.location || "").replace(/"/g, '""')}"`, a.quantity, a.counted_quantity ?? "",
    a.unit_cost, a.total_cost, a.condition || "Good", a.status, a.purchase_date?.slice(0, 10) || "",
  ].join(","));
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `asset-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AssetManagementPage() {
  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [staffOptions, setStaffOptions] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    assetCode: "",
    category: "Furniture",
    quantity: 1,
    unitCost: 0,
    location: "",
    status: "Available",
    condition: "Good",
    assignedTo: "",
    purchaseDate: "",
    notes: "",
  });

  const [countTarget, setCountTarget] = useState(null);
  const [disposalTarget, setDisposalTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [search, categoryFilter, statusFilter]);

  useEffect(() => {
    fetch("/api/assets/staff-options").then((r) => r.json())
      .then((d) => { if (d.success) setStaffOptions(d.data); })
      .catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search,
        category: categoryFilter,
        status: statusFilter,
      }).toString();

      const [resAssets, resSummary] = await Promise.all([
        fetch(`/api/assets?${query}`).then((r) => r.json()),
        fetch("/api/assets/summary").then((r) => r.json()),
      ]);

      if (resAssets.success) setAssets(resAssets.data);
      if (resSummary.success) setSummary(resSummary.data);
    } catch (err) {
      console.error("Failed to load assets", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (asset = null) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        name: asset.name,
        assetCode: asset.asset_code || "",
        category: asset.category || "Furniture",
        quantity: asset.quantity || 1,
        unitCost: asset.unit_cost || 0,
        location: asset.location || "",
        status: asset.status || "Available",
        condition: asset.condition || "Good",
        usefulLifeYears: asset.useful_life_years || "",
        assignedTo: asset.assigned_to || "",
        purchaseDate: asset.purchase_date ? asset.purchase_date.split("T")[0] : "",
        notes: asset.notes || "",
      });
    } else {
      setEditingAsset(null);
      setFormData({
        name: "",
        assetCode: `AST-${Math.floor(1000 + Math.random() * 9000)}`,
        category: "Furniture",
        quantity: 1,
        unitCost: 0,
        location: "",
        status: "Available",
        condition: "Good",
        usefulLifeYears: "",
        assignedTo: "",
        purchaseDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingAsset ? `/api/assets/${editingAsset.id}` : "/api/assets";
      const method = editingAsset ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to save asset", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this asset record?")) return;
    try {
      const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      console.error("Failed to delete asset", err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Available":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3" /> Available</span>;
      case "In Use":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Building className="w-3 h-3" /> In Use</span>;
      case "Maintenance":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Wrench className="w-3 h-3" /> Maintenance</span>;
      case "Broken":
      case "Disposed":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800"><AlertTriangle className="w-3 h-3" /> {status}</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Package className="h-7 w-7 text-primary" /> School Asset & Inventory Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track all school physical assets, equipment, furniture, devices, and inventory status.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setReportOpen(true)} variant="outline" className="flex items-center gap-2 shadow bg-white">
            <FileText className="w-4 h-4" /> Inventory Report
          </Button>
          <Button onClick={exportCsv} variant="outline" className="flex items-center gap-2 shadow bg-white">
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button onClick={() => handleOpenModal()} className="flex items-center gap-2 shadow">
            <Plus className="w-4 h-4" /> Add New Asset
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Valuation</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              ETB {parseFloat(summary?.totals?.total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Quantity</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary?.totals?.total_quantity || 0} Units</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Available Items</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{summary?.totals?.available_items || 0}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Under Maintenance</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{summary?.totals?.in_maintenance || 0}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Wrench className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search asset name, tag, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
            >
              <option value="all">All Categories</option>
              <option value="Furniture">Furniture</option>
              <option value="Electronics">Electronics/Computers</option>
              <option value="Books">Books/Library</option>
              <option value="Lab">Lab Equipment</option>
              <option value="Sports">Sports</option>
              <option value="Vehicle">Vehicle</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="Available">Available</option>
            <option value="In Use">In Use</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Broken">Broken</option>
            <option value="Disposed">Disposed</option>
          </select>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3">Asset & Tag</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3 text-center">Qty</th>
                <th className="px-6 py-3 text-right">Unit Cost</th>
                <th className="px-6 py-3 text-right">Total Cost</th>
                <th className="px-6 py-3">Condition</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-gray-500">Loading school assets...</td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-gray-500">No assets found matching your query.</td>
                </tr>
              ) : (
                assets.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{item.asset_code}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{item.category}</td>
                    <td className="px-6 py-4 text-gray-600">{item.location || "Unassigned"}</td>
                    <td className="px-6 py-4 text-center font-medium">{item.quantity}</td>
                    <td className="px-6 py-4 text-right text-gray-600">ETB {parseFloat(item.unit_cost || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">ETB {parseFloat(item.total_cost || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.condition === "Good" ? "bg-emerald-100 text-emerald-700" :
                        item.condition === "Fair" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                      }`}>{item.condition || "Good"}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(item.status)}
                      {item.status === "Disposed" && item.disposal_date && (
                        <div className="text-[11px] text-gray-400 mt-1">{new Date(item.disposal_date).toLocaleDateString()} · {item.disposal_method}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          title="Assignment history"
                          onClick={() => setHistoryTarget(item)}
                          className="p-1.5 text-gray-500 hover:text-primary rounded-lg hover:bg-gray-100"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          title="Annual physical count"
                          onClick={() => setCountTarget(item)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                        </button>
                        {(item.status === "Broken" || item.status === "Maintenance") && (
                          <button
                            title="Create repair ticket"
                            onClick={async () => {
                              await fetch("/api/facilities/maintenance", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  title: `Repair: ${item.name} (${item.asset_code})`,
                                  location: item.location || "—",
                                  category: item.category === "Electronics" ? "electrical" : "furniture",
                                  description: `Repair needed for ${item.name} — condition: ${item.condition}.`,
                                }),
                              });
                              alert("Maintenance ticket created.");
                            }}
                            className="p-1.5 text-gray-500 hover:text-amber-600 rounded-lg hover:bg-amber-50"
                          >
                            <Wrench className="w-4 h-4" />
                          </button>
                        )}
                        {item.status !== "Disposed" && (
                          <button
                            title="Flag as out of use / dispose"
                            onClick={() => setDisposalTarget(item)}
                            className="p-1.5 text-gray-500 hover:text-orange-600 rounded-lg hover:bg-orange-50"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-1.5 text-gray-500 hover:text-primary rounded-lg hover:bg-gray-100"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-gray-500 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Asset Modal */}
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
              {editingAsset ? "Edit School Asset" : "Add New School Asset"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dell Latitude Laptop / Student Desk"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Asset Tag / Code</label>
                  <input
                    type="text"
                    placeholder="AST-1001"
                    value={formData.assetCode}
                    onChange={(e) => setFormData({ ...formData, assetCode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                  >
                    <option value="Furniture">Furniture</option>
                    <option value="Electronics">Electronics/Computers</option>
                    <option value="Books">Books/Library</option>
                    <option value="Lab">Lab Equipment</option>
                    <option value="Sports">Sports</option>
                    <option value="Vehicle">Vehicle</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Unit Cost (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Location / Room</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Lab A / Room 204"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                  >
                    <option value="Available">Available</option>
                    <option value="In Use">In Use</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Broken">Broken</option>
                    <option value="Disposed">Disposed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                  >
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Useful Life (years)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 5"
                    value={formData.usefulLifeYears}
                    onChange={(e) => setFormData({ ...formData, usefulLifeYears: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Assigned To (optional)</label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                  >
                    <option value="">— Not assigned —</option>
                    {staffOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.role.replace(/_/g, " ")})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notes / Specifications</label>
                <textarea
                  rows="2"
                  placeholder="Additional information..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingAsset ? "Update Asset" : "Save Asset"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Physical Count Dialog */}
      {countTarget && (
        <CountDialog asset={countTarget} onClose={() => setCountTarget(null)} onDone={() => { setCountTarget(null); fetchData(); }} />
      )}

      {/* Dispose Dialog */}
      {disposalTarget && (
        <DisposeDialog
          asset={disposalTarget}
          onClose={() => setDisposalTarget(null)}
          onDone={() => { setDisposalTarget(null); fetchData(); }}
        />
      )}

      {/* Assignment History Dialog */}
      {historyTarget && (
        <HistoryDialog asset={historyTarget} onClose={() => setHistoryTarget(null)} />
      )}

      {/* Inventory Report Modal */}
      {reportOpen && (
        <InventoryReportModal onClose={() => setReportOpen(false)} />
      )}
    </div>
  );
}

function DisposeDialog({ asset, onClose, onDone }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    reason: "",
    method: "Scrapped",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/assets/${asset.id}/dispose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: form.date, reason: form.reason, method: form.method }),
      });
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 text-gray-400">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Flag as out of use / Dispose</h2>
        <p className="text-sm text-gray-500 mb-4">
          {asset.name} <span className="font-mono text-xs">({asset.asset_code})</span> — value ${parseFloat(asset.total_cost || 0).toFixed(2)}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Disposal Date</label>
              <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Method</label>
              <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                <option>Scrapped</option>
                <option>Sold</option>
                <option>Donated</option>
                <option>Lost</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Reason (required)</label>
            <textarea rows="2" required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Broken beyond repair / old age / lost"
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              Confirm Disposal
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HistoryDialog({ asset, onClose }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    fetch(`/api/assets/${asset.id}/assignments`).then((r) => r.json())
      .then((d) => setRows(d.data || []))
      .catch(() => setRows([]));
  }, [asset.id]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border relative max-h-[80vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 text-gray-400">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Assignment History</h2>
        <p className="text-sm text-gray-500 mb-4">{asset.name} <span className="font-mono text-xs">({asset.asset_code})</span></p>
        {rows === null ? (
          <p className="py-6 text-center text-gray-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">This asset has never been assigned to anyone.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{r.holder_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{(r.holder_role || "").replace(/_/g, " ")}</p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>from {new Date(r.assigned_at).toLocaleDateString()}</p>
                  <p>{r.unassigned_at ? `to ${new Date(r.unassigned_at).toLocaleDateString()}` : <span className="text-green-600 font-medium">current holder</span>}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InventoryReportModal({ onClose }) {
  const year = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(year);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/assets/inventory-report?year=${selectedYear}`).then((r) => r.json())
      .then((d) => { if (d.success) setReport(d.data); })
      .finally(() => setLoading(false));
  }, [selectedYear]);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print">
        <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border relative max-h-[90vh] overflow-y-auto print-area">
          <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 text-gray-400 no-print">
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Fixed Asset Inventory Report — {selectedYear}</h2>
              <p className="text-sm text-gray-500">Mount Olive School · Generated {new Date().toLocaleString()}</p>
            </div>
            <div className="flex gap-2 no-print">
              <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="border rounded-lg px-2 py-1.5 text-sm bg-white">
                {[0,1,2,3].map((i) => (
                  <option key={i} value={year - i}>{year - i}</option>
                ))}
              </select>
              <Button onClick={() => window.print()} className="flex items-center gap-2">
                <FileText className="w-4 h-4" /> Print
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="py-10 text-center text-gray-500">Generating report…</p>
          ) : report && (
            <div className="space-y-6 text-sm">
              {/* Totals */}
              <div className="grid grid-cols-4 gap-3">
                <div className="border rounded-lg p-3"><p className="text-[11px] text-gray-500 uppercase">Asset Lines</p><p className="text-xl font-bold">{report.totals?.items ?? 0}</p></div>
                <div className="border rounded-lg p-3"><p className="text-[11px] text-gray-500 uppercase">Total Units</p><p className="text-xl font-bold">{report.totals?.units ?? 0}</p></div>
                <div className="border rounded-lg p-3"><p className="text-[11px] text-gray-500 uppercase">Acquired {selectedYear}</p><p className="text-xl font-bold text-blue-600">{report.totals?.acquired_count ?? 0}</p></div>
                <div className="border rounded-lg p-3"><p className="text-[11px] text-gray-500 uppercase">Disposed {selectedYear}</p><p className="text-xl font-bold text-orange-600">{report.disposed?.length ?? 0}</p></div>
              </div>

              {/* By category */}
              <table className="w-full border-collapse border">
                <thead><tr className="bg-gray-50">
                  <th className="border p-2 text-left">Category</th>
                  <th className="border p-2 text-right">Lines</th>
                  <th className="border p-2 text-right">Units</th>
                  <th className="border p-2 text-right">Value (ETB)</th>
                </tr></thead>
                <tbody>
                  {(report.byCategory || []).map((c) => (
                    <tr key={c.category}>
                      <td className="border p-2">{c.category}</td>
                      <td className="border p-2 text-right">{c.items}</td>
                      <td className="border p-2 text-right">{c.units}</td>
                      <td className="border p-2 text-right font-semibold">{Number(c.value).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td className="border p-2">TOTAL</td>
                    <td className="border p-2 text-right">{report.totals?.items ?? 0}</td>
                    <td className="border p-2 text-right">{report.totals?.units ?? 0}</td>
                    <td className="border p-2 text-right">{Number(report.totals?.total_value || 0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                  </tr>
                </tbody>
              </table>

              {/* Status & condition */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold mb-1">By status</p>
                  <ul className="text-gray-600 space-y-0.5">
                    {(report.byStatus || []).map((s) => <li key={s.status}>• {s.status}: {s.count}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-1">By condition</p>
                  <ul className="text-gray-600 space-y-0.5">
                    {(report.byCondition || []).map((c) => <li key={c.condition || "Good"}>• {c.condition || "Good"}: {c.count}</li>)}
                  </ul>
                </div>
              </div>

              {/* Disposed */}
              <div>
                <p className="font-semibold mb-2">Disposed / written off in {selectedYear}</p>
                <table className="w-full border-collapse border">
                  <thead><tr className="bg-gray-50">
                    <th className="border p-2 text-left">Asset</th>
                    <th className="border p-2 text-left">Date</th>
                    <th className="border p-2 text-left">Method</th>
                    <th className="border p-2 text-left">Reason</th>
                    <th className="border p-2 text-right">Value</th>
                  </tr></thead>
                  <tbody>
                    {(report.disposed || []).map((d) => (
                      <tr key={d.id}>
                        <td className="border p-2">{d.name} <span className="font-mono text-xs text-gray-400">{d.asset_code}</span></td>
                        <td className="border p-2">{d.disposal_date ? String(d.disposal_date).slice(0,10) : "—"}</td>
                        <td className="border p-2">{d.disposal_method || "—"}</td>
                        <td className="border p-2">{d.disposal_reason || "—"}</td>
                        <td className="border p-2 text-right">{Number(d.value || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {!(report.disposed || []).length && <tr><td colSpan="5" className="border p-3 text-center text-gray-400">None disposed this year</td></tr>}
                  </tbody>
                </table>
              </div>

              {/* Count discrepancies */}
              {(report.countDiscrepancies || []).length > 0 && (
                <div>
                  <p className="font-semibold mb-2 text-red-700">Physical count discrepancies (flagged)</p>
                  <table className="w-full border-collapse border">
                    <thead><tr className="bg-gray-50">
                      <th className="border p-2 text-left">Asset</th>
                      <th className="border p-2 text-right">System qty</th>
                      <th className="border p-2 text-right">Counted</th>
                      <th className="border p-2 text-left">Notes</th>
                    </tr></thead>
                    <tbody>
                      {report.countDiscrepancies.map((d) => (
                        <tr key={d.id}>
                          <td className="border p-2">{d.name} <span className="font-mono text-xs text-gray-400">{d.asset_code}</span></td>
                          <td className="border p-2 text-right">{d.quantity}</td>
                          <td className="border p-2 text-right font-bold text-red-600">{d.counted_quantity}</td>
                          <td className="border p-2">{d.count_notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="grid grid-cols-3 gap-8 pt-8 text-center text-xs text-gray-500">
                <div className="border-t pt-1">Prepared by<br/><strong>General Services Head</strong></div>
                <div className="border-t pt-1">Verified by<br/><strong>General Manager</strong></div>
                <div className="border-t pt-1">Approved by<br/><strong>School Owner / Board</strong></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function CountDialog({ asset, onClose, onDone }) {
  const [form, setForm] = useState({
    countedQuantity: asset.quantity,
    countedDate: new Date().toISOString().slice(0, 10),
    countNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const discrepancy = Number(form.countedQuantity) !== Number(asset.quantity);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/assets/${asset.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: asset.name, assetCode: asset.asset_code, category: asset.category,
          quantity: asset.quantity, unitCost: asset.unit_cost, status: asset.status,
          condition: asset.condition,
          countedQuantity: Number(form.countedQuantity),
          countedDate: form.countedDate,
          countNotes: form.countNotes,
        }),
      });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 text-gray-400">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Annual physical count</h2>
        <p className="text-sm text-gray-500 mb-4">{asset.name} — system quantity: <strong>{asset.quantity}</strong></p>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Counted quantity</label>
              <input type="number" min="0" required value={form.countedQuantity}
                onChange={(e) => setForm({ ...form, countedQuantity: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Count date</label>
              <input type="date" value={form.countedDate} onChange={(e) => setForm({ ...form, countedDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          {discrepancy && (
            <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded p-2">
              ⚠ Discrepancy: system {asset.quantity} vs counted {form.countedQuantity}. This will be flagged in the inventory report.
            </p>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notes</label>
            <textarea rows="2" value={form.countNotes} onChange={(e) => setForm({ ...form, countNotes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Condition remarks, missing units explanation…" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>Save count</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
