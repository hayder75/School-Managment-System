import { useState, useEffect } from "react";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { BookOpen, Bus, BedDouble } from "lucide-react";

const TABS = [
  { key: "library", label: "Library", icon: BookOpen },
  { key: "transport", label: "Transport", icon: Bus },
  { key: "hostel", label: "Hostel", icon: BedDouble },
];

export default function OperationsPage() {
  const [tab, setTab] = useState("library");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Operations</h1>
      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${tab === t.key ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground"}`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>
      {tab === "library" && <LibraryTab />}
      {tab === "transport" && <TransportTab />}
      {tab === "hostel" && <HostelTab />}
    </div>
  );
}

function LibraryTab() {
  const [books, setBooks] = useState([]);
  const [borrowings, setBorrowings] = useState([]);
  const [form, setForm] = useState({ title: "", author: "", total_copies: 1 });
  const [borrowForm, setBorrowForm] = useState({ book_id: "", student_id: "", due_date: "" });
  const [students, setStudents] = useState([]);

  useEffect(() => { loadBooks(); loadBorrowings(); api.get("/students?limit=200").then(r => setStudents(r.data || [])).catch(()=>{}); }, []);
  async function loadBooks() { const r = await api.get("/operations/books"); setBooks(r.data || []); }
  async function loadBorrowings() { const r = await api.get("/operations/books/borrowings"); setBorrowings(r.data || []); }

  async function addBook() { await api.post("/operations/books", { ...form, total_copies: Number(form.total_copies), available_copies: Number(form.total_copies) }); setForm({ title: "", author: "", total_copies: 1 }); loadBooks(); }
  async function borrowBook() { await api.post("/operations/books/borrow", borrowForm); setBorrowForm({ book_id: "", student_id: "", due_date: "" }); loadBorrowings(); }
  async function returnBook(id) { await api.patch(`/operations/books/return/${id}`); loadBorrowings(); loadBooks(); }

  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle>Add Book</CardTitle></CardHeader>
        <CardContent><div className="flex gap-2 items-end">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form,title:e.target.value})} /></div>
          <div><Label>Author</Label><Input value={form.author} onChange={e => setForm({...form,author:e.target.value})} /></div>
          <div><Label>Copies</Label><Input type="number" value={form.total_copies} onChange={e => setForm({...form,total_copies:e.target.value})} className="w-20" /></div>
          <Button onClick={addBook}>Add</Button>
        </div></CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Books ({books.length})</CardTitle></CardHeader>
        <CardContent><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {books.map(b => <div key={b.id} className="border rounded-md p-3 text-sm"><p className="font-medium">{b.title}</p><p className="text-xs text-muted-foreground">{b.author}<br/>{b.available_copies}/{b.total_copies} available</p></div>)}
          {books.length === 0 && <p className="text-muted-foreground">No books</p>}
        </div></CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Borrow Book</CardTitle></CardHeader>
        <CardContent><div className="flex gap-2 items-end flex-wrap">
          <div><Label>Book</Label><select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={borrowForm.book_id} onChange={e => setBorrowForm({...borrowForm,book_id:e.target.value})}>
            <option value="">Select book</option>{books.filter(b=>b.available_copies>0).map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select></div>
          <div><Label>Student</Label><select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={borrowForm.student_id} onChange={e => setBorrowForm({...borrowForm,student_id:e.target.value})}>
            <option value="">Select student</option>{students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
          </select></div>
          <div><Label>Due</Label><Input type="date" value={borrowForm.due_date} onChange={e => setBorrowForm({...borrowForm,due_date:e.target.value})} /></div>
          <Button onClick={borrowBook}>Borrow</Button>
        </div></CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Borrowings</CardTitle></CardHeader>
        <CardContent><div className="space-y-2">
          {borrowings.filter(b=>b.status==='borrowed').map(b => <div key={b.id} className="flex items-center justify-between border rounded-md p-3">
            <div className="text-sm"><span className="font-medium">{b.book_title}</span> — {b.student_name}<br/><span className="text-xs text-muted-foreground">Due: {b.due_date?.slice(0,10)}</span></div>
            <Button size="sm" onClick={() => returnBook(b.id)}>Return</Button>
          </div>)}
          {borrowings.filter(b=>b.status==='borrowed').length === 0 && <p className="text-sm text-muted-foreground">No active borrowings</p>}
        </div></CardContent>
      </Card>
    </div>
  );
}

function TransportTab() {
  const [routes, setRoutes] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [form, setForm] = useState({ route_name: "", driver_name: "", capacity: 30 });
  const [allocForm, setAllocForm] = useState({ route_id: "", student_id: "" });
  const [students, setStudents] = useState([]);

  useEffect(() => { loadRoutes(); loadAllocations(); api.get("/students?limit=200").then(r => setStudents(r.data || [])).catch(()=>{}); }, []);
  async function loadRoutes() { const r = await api.get("/operations/routes"); setRoutes(r.data || []); }
  async function loadAllocations() { const r = await api.get("/operations/routes/allocations"); setAllocations(r.data || []); }
  async function addRoute() { await api.post("/operations/routes", { ...form, capacity: Number(form.capacity) }); setForm({ route_name: "", driver_name: "", capacity: 30 }); loadRoutes(); }
  async function allocate() { await api.post("/operations/routes/allocate", allocForm); loadAllocations(); }

  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle>Add Route</CardTitle></CardHeader>
        <CardContent><div className="flex gap-2 items-end">
          <div><Label>Route Name</Label><Input value={form.route_name} onChange={e => setForm({...form,route_name:e.target.value})} /></div>
          <div><Label>Driver</Label><Input value={form.driver_name} onChange={e => setForm({...form,driver_name:e.target.value})} /></div>
          <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={e => setForm({...form,capacity:e.target.value})} className="w-20" /></div>
          <Button onClick={addRoute}>Add</Button>
        </div></CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>Routes</CardTitle></CardHeader>
          <CardContent><div className="space-y-2">
            {routes.map(r => <div key={r.id} className="border rounded-md p-3 text-sm"><p className="font-medium">{r.route_name}</p><p className="text-xs text-muted-foreground">{r.driver_name} · {r.capacity} seats</p></div>)}
            {routes.length === 0 && <p className="text-sm text-muted-foreground">No routes</p>}
          </div></CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Allocate Student</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><Label>Route</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={allocForm.route_id} onChange={e => setAllocForm({...allocForm,route_id:e.target.value})}>
              <option value="">Select route</option>{routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
            </select></div>
            <div><Label>Student</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={allocForm.student_id} onChange={e => setAllocForm({...allocForm,student_id:e.target.value})}>
              <option value="">Select student</option>{students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select></div>
            <Button onClick={allocate} className="w-full">Allocate</Button>
          </CardContent>
        </Card>
      </div>
      <Card><CardHeader><CardTitle>Allocations</CardTitle></CardHeader>
        <CardContent><div className="space-y-1 text-sm">{allocations.map(a => <div key={a.id} className="border-b py-2">{a.student_name} → {a.route_name}</div>)}
          {allocations.length === 0 && <p className="text-muted-foreground">No allocations</p>}
        </div></CardContent>
      </Card>
    </div>
  );
}

function HostelTab() {
  const [rooms, setRooms] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [form, setForm] = useState({ room_number: "", block_name: "A", capacity: 4 });
  const [allocForm, setAllocForm] = useState({ room_id: "", student_id: "", bed_number: "" });
  const [students, setStudents] = useState([]);

  useEffect(() => { loadRooms(); loadAllocations(); api.get("/students?limit=200").then(r => setStudents(r.data || [])).catch(()=>{}); }, []);
  async function loadRooms() { const r = await api.get("/operations/rooms"); setRooms(r.data || []); }
  async function loadAllocations() { const r = await api.get("/operations/rooms/allocations"); setAllocations(r.data || []); }
  async function addRoom() { await api.post("/operations/rooms", { ...form, capacity: Number(form.capacity) }); setForm({ room_number: "", block_name: "A", capacity: 4 }); loadRooms(); }
  async function allocate() { await api.post("/operations/rooms/allocate", { ...allocForm, bed_number: allocForm.bed_number ? Number(allocForm.bed_number) : undefined }); loadAllocations(); loadRooms(); }

  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle>Add Room</CardTitle></CardHeader>
        <CardContent><div className="flex gap-2 items-end">
          <div><Label>Room</Label><Input value={form.room_number} onChange={e => setForm({...form,room_number:e.target.value})} className="w-24" /></div>
          <div><Label>Block</Label><Input value={form.block_name} onChange={e => setForm({...form,block_name:e.target.value})} className="w-20" /></div>
          <div><Label>Beds</Label><Input type="number" value={form.capacity} onChange={e => setForm({...form,capacity:e.target.value})} className="w-20" /></div>
          <Button onClick={addRoom}>Add</Button>
        </div></CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>Rooms</CardTitle></CardHeader>
          <CardContent><div className="grid grid-cols-2 gap-2">
            {rooms.map(r => <div key={r.id} className="border rounded-md p-3 text-sm"><p className="font-medium">{r.block_name}-{r.room_number}</p><p className="text-xs text-muted-foreground">{r.current_occupancy}/{r.capacity} occupied</p></div>)}
            {rooms.length === 0 && <p className="text-muted-foreground">No rooms</p>}
          </div></CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Allocate Bed</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><Label>Room</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={allocForm.room_id} onChange={e => setAllocForm({...allocForm,room_id:e.target.value})}>
              <option value="">Select room</option>{rooms.filter(r=>r.current_occupancy<r.capacity).map(r => <option key={r.id} value={r.id}>{r.block_name}-{r.room_number} ({r.current_occupancy}/{r.capacity})</option>)}
            </select></div>
            <div><Label>Student</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={allocForm.student_id} onChange={e => setAllocForm({...allocForm,student_id:e.target.value})}>
              <option value="">Select student</option>{students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select></div>
            <div><Label>Bed #</Label><Input type="number" value={allocForm.bed_number} onChange={e => setAllocForm({...allocForm,bed_number:e.target.value})} /></div>
            <Button onClick={allocate} className="w-full">Allocate</Button>
          </CardContent>
        </Card>
      </div>
      <Card><CardHeader><CardTitle>Allocations</CardTitle></CardHeader>
        <CardContent><div className="space-y-1 text-sm">{allocations.map(a => <div key={a.id} className="border-b py-2">{a.student_name} → {a.block_name}-{a.room_number} (Bed #{a.bed_number})</div>)}
          {allocations.length === 0 && <p className="text-muted-foreground">No allocations</p>}
        </div></CardContent>
      </Card>
    </div>
  );
}
