import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AppData,
  AssessmentType,
  AttendanceStatus,
  Exam,
  ExamAttempt,
  Question,
  SchoolClass,
  Student,
  User,
} from "@/types";
import {
  ATTENDANCE_COLORS,
  ATTENDANCE_LABELS,
  COMMON_SUBJECTS,
  DAYS,
  DESCRIPTIVE_LEVELS,
} from "@/types";
import html2canvas from "html2canvas";
import {
  defaultAdmin,
  exportToCSV,
  exportToJSON,
  generateId,
  getInitialData,
  getSession,
  jalaliNowDisplay,
  loadData,
  readJSONFile,
  saveData,
  setSession,
  todayJalali,
} from "@/lib/utils";

type View =
  | "dashboard"
  | "classes"
  | "students"
  | "attendance"
  | "assessments"
  | "behaviors"
  | "schedule"
  | "reports"
  | "messages"
  | "exams"
  | "admin_users"
  | "admin_overview"
  | "admin_students"
  | "admin_reports"
  | "admin_backup";

const gradeOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function App() {
  const [data, setData] = useState<AppData>(getInitialData);
  const [session, setSessionState] = useState<User | null>(getSession);
  const [view, setView] = useState<View>("dashboard");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setData(loadData());
  }, []);

  useEffect(() => {
    saveData(data);
  }, [data]);

  useEffect(() => {
    setSession(session);
  }, [session]);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const updateData = (fn: (draft: AppData) => AppData) => {
    setData((prev) => fn(prev));
  };

  if (!session) {
    return (
      <LoginScreen
        data={data}
        onLogin={(user) => {
          setSessionState(user);
          setView(user.role === "admin" ? "admin_overview" : user.role === "student" ? "dashboard" : "dashboard");
        }}
      />
    );
  }

  if (!session.isActive) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-2xl">🚫</div>
          <h2 className="mb-2 text-xl font-bold text-rose-700">حساب کاربری غیرفعال است</h2>
          <p className="mb-6 text-slate-600">دسترسی شما توسط مدیر قطع شده است. لطفاً با مدیر سیستم تماس بگیرید.</p>
          <button
            onClick={() => setSessionState(null)}
            className="rounded-xl bg-slate-800 px-6 py-2.5 font-medium text-white hover:bg-slate-700"
          >
            بازگشت به صفحه ورود
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {notice && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-600 px-6 py-3 text-white shadow-lg">
          {notice}
        </div>
      )}
      <Header session={session} onLogout={() => setSessionState(null)} />
      <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 lg:flex-row">
        <Sidebar session={session} view={view} setView={setView} />
        <main className="flex-1 rounded-3xl border border-white/50 bg-white/80 p-5 shadow-xl backdrop-blur md:p-6">
          {session.role === "admin" ? (
            <AdminContent view={view} data={data} updateData={updateData} showNotice={showNotice} session={session} />
          ) : session.role === "student" ? (
            view === "messages" ? <MessageManager data={data} updateData={updateData} currentUser={session} /> :
            view === "exams" ? <StudentExamPanel data={data} updateData={updateData} studentUser={session} /> :
            <StudentPanel data={data} studentUser={session} />
          ) : (
            <TeacherContent
              view={view}
              data={data}
              updateData={updateData}
              teacherId={session.id}
              showNotice={showNotice}
              session={session}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function LoginScreen({ data, onLogin }: { data: AppData; onLogin: (u: User) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const user = data.users.find((u) => u.username === username && u.password === password);
    if (!user) {
      setError("نام کاربری یا رمز عبور اشتباه است.");
      return;
    }
    onLogin(user);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/90 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl text-white shadow-lg">
            🏫
          </div>
          <h1 className="text-2xl font-bold text-slate-900">سیستم مدیریت مدرسه</h1>
          <p className="mt-2 text-slate-500">ورود به پنل کاربری</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">نام کاربری</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="مثلاً admin"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">رمز عبور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="••••••"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-md transition hover:bg-indigo-700"
          >
            ورود
          </button>
        </form>
      </div>
    </div>
  );
}

function Header({ session, onLogout }: { session: User; onLogout: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg text-white">🏫</div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">مدرسه هوشمند</h1>
            <p className="text-xs text-slate-500">{jalaliNowDisplay()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-left md:block">
            <p className="text-sm font-semibold text-slate-800">{session.name}</p>
            <p className="text-xs text-slate-500">
              {session.role === "admin" ? "مدیر سیستم" : session.role === "student" ? "دانش‌آموز" : "معلم"}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            خروج
          </button>
        </div>
      </div>
    </header>
  );
}

function Sidebar({
  session,
  view,
  setView,
}: {
  session: User;
  view: View;
  setView: (v: View) => void;
}) {
  const adminItems: { id: View; label: string; icon: string }[] = [
    { id: "admin_overview", label: "داشبورد مدیر", icon: "📊" },
    { id: "admin_users", label: "مدیریت کاربران", icon: "👤" },
    { id: "admin_students", label: "همه دانش‌آموزان", icon: "👨‍🎓" },
    { id: "admin_reports", label: "گزارش کامل", icon: "📋" },
    { id: "messages", label: "پیام‌ها", icon: "✉️" },
    { id: "admin_backup", label: "پشتیبان / بازیابی", icon: "💾" },
  ];
  const studentItems: { id: View; label: string; icon: string }[] = [
    { id: "dashboard", label: "کارنامه من", icon: "🎓" },
    { id: "exams", label: "آزمون‌ها", icon: "❓" },
    { id: "messages", label: "پیام‌ها", icon: "✉️" },
  ];
  const teacherItems: { id: View; label: string; icon: string }[] = [
    { id: "dashboard", label: "داشبورد", icon: "🏠" },
    { id: "classes", label: "کلاس‌ها", icon: "🏫" },
    { id: "students", label: "دانش‌آموزان", icon: "👨‍🎓" },
    { id: "attendance", label: "حضور و غیاب", icon: "📅" },
    { id: "assessments", label: "ارزشیابی", icon: "📝" },
    { id: "exams", label: "آزمون", icon: "❓" },
    { id: "behaviors", label: "پرونده رفتاری", icon: "📋" },
    { id: "schedule", label: "برنامه هفتگی", icon: "📚" },
    { id: "reports", label: "کارنامه / گزارش", icon: "🖨️" },
    { id: "messages", label: "پیام‌ها", icon: "✉️" },
  ];
  const items = session.role === "admin" ? adminItems : session.role === "student" ? studentItems : teacherItems;
  return (
    <nav className="shrink-0 rounded-3xl border border-white/50 bg-white/80 p-3 shadow-xl backdrop-blur lg:w-64">
      <ul className="flex flex-wrap gap-2 lg:flex-col">
        {items.map((item) => (
          <li key={item.id} className="flex-1 lg:flex-none">
            <button
              onClick={() => setView(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                view === item.id
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{item.icon}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function AdminContent({
  view,
  data,
  updateData,
  showNotice,
  session,
}: {
  view: View;
  data: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  showNotice: (m: string) => void;
  session: User;
}) {
  if (view === "admin_users") return <ManageUsers data={data} updateData={updateData} showNotice={showNotice} session={session} />;
  if (view === "admin_students") return <AdminAllStudents data={data} updateData={updateData} showNotice={showNotice} />;
  if (view === "admin_reports") return <AdminReports data={data} />;
  if (view === "messages") return <MessageManager data={data} updateData={updateData} currentUser={session} />;
  if (view === "admin_backup") return <BackupRestore data={data} updateData={updateData} showNotice={showNotice} />;
  return <AdminOverview data={data} />;
}

function AdminOverview({ data }: { data: AppData }) {
  const stats = [
    { label: "معلمان", value: data.users.filter((u) => u.role === "teacher").length, color: "bg-blue-500" },
    { label: "کلاس‌ها", value: data.classes.length, color: "bg-emerald-500" },
    { label: "دانش‌آموزان", value: data.students.length, color: "bg-violet-500" },
    { label: "ارزشیابی‌ها", value: data.assessments.length, color: "bg-amber-500" },
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">داشبورد مدیریت</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className={`mb-3 h-1.5 w-10 rounded-full ${s.color}`} />
            <p className="text-3xl font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-slate-800">کلاس‌ها و معلمان</h3>
        {data.classes.length === 0 ? (
          <p className="text-slate-500">هنوز کلاسی ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-right">نام کلاس</th>
                  <th className="px-4 py-3 text-right">پایه</th>
                  <th className="px-4 py-3 text-right">معلم</th>
                  <th className="px-4 py-3 text-right">تعداد دانش‌آموز</th>
                </tr>
              </thead>
              <tbody>
                {data.classes.map((c) => {
                  const teacher = data.users.find((u) => u.id === c.teacherId);
                  const count = data.students.filter((s) => s.classId === c.id).length;
                  return (
                    <tr key={c.id} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3">{c.grade}</td>
                      <td className="px-4 py-3">{teacher?.name || "—"}</td>
                      <td className="px-4 py-3">{count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminAllStudents({
  data,
  updateData,
  showNotice,
}: {
  data: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  showNotice: (m: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Student | null>(null);

  const filtered = data.students.filter((s) =>
    s.fullName.includes(search) || s.nationalId.includes(search)
  );

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    updateData((d) => ({
      ...d,
      students: d.students.map((s) => (s.id === editing.id ? editing : s)),
    }));
    setEditing(null);
    showNotice("اطلاعات دانش‌آموز ویرایش شد.");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">همه دانش‌آموزان</h2>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="جستجو بر اساس نام یا کد ملی"
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
      />
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-right">نام</th>
              <th className="px-4 py-3 text-right">کلاس</th>
              <th className="px-4 py-3 text-right">پایه</th>
              <th className="px-4 py-3 text-right">معلم</th>
              <th className="px-4 py-3 text-right">کد ملی</th>
              <th className="px-4 py-3 text-right">تماس</th>
              <th className="px-4 py-3 text-right">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const cls = data.classes.find((c) => c.id === s.classId);
              const teacher = data.users.find((u) => u.id === cls?.teacherId);
              return (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{s.fullName}</td>
                  <td className="px-4 py-3">{cls?.name || "—"}</td>
                  <td className="px-4 py-3">{cls?.grade || "—"}</td>
                  <td className="px-4 py-3">{teacher?.name || "—"}</td>
                  <td className="px-4 py-3">{s.nationalId || "—"}</td>
                  <td className="px-4 py-3">{s.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditing(s)}
                      className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
                    >
                      ویرایش
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  دانش‌آموزی یافت نشد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-bold text-slate-900">ویرایش اطلاعات دانش‌آموز</h3>
            <form onSubmit={saveEdit} className="grid gap-4 md:grid-cols-2">
              <input
                value={editing.fullName}
                onChange={(e) => setEditing({ ...editing, fullName: e.target.value })}
                placeholder="نام و نام خانوادگی"
                className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
              />
              <select
                value={editing.classId}
                onChange={(e) => setEditing({ ...editing, classId: e.target.value })}
                className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
              >
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} (پایه {c.grade})</option>
                ))}
              </select>
              <input
                value={editing.nationalId}
                onChange={(e) => setEditing({ ...editing, nationalId: e.target.value })}
                placeholder="کد ملی"
                className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
              />
              <input
                value={editing.fatherName}
                onChange={(e) => setEditing({ ...editing, fatherName: e.target.value })}
                placeholder="نام پدر"
                className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
              />
              <input
                value={editing.phone}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                placeholder="شماره تماس والدین"
                className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
              />
              <input
                value={editing.birthDate}
                onChange={(e) => setEditing({ ...editing, birthDate: e.target.value })}
                placeholder="تاریخ تولد"
                className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
              />
              <input
                value={editing.address}
                onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                placeholder="آدرس"
                className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500 md:col-span-2"
              />
              <div className="flex gap-3 md:col-span-2">
                <button type="submit" className="rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700">
                  ذخیره تغییرات
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-xl border border-slate-200 px-6 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminReports({ data }: { data: AppData }) {
  const [classFilter, setClassFilter] = useState("");
  const classes = classFilter ? data.classes.filter((c) => c.id === classFilter) : data.classes;
  const presentTotal = data.attendance.filter((a) => a.status === "present").length;
  const absentTotal = data.attendance.filter((a) => a.status === "absent").length;
  const lateTotal = data.attendance.filter((a) => a.status === "late").length;
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">گزارش کامل مدرسه</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-emerald-600">{presentTotal}</p>
          <p className="text-sm text-slate-500">کل حضور</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-rose-600">{absentTotal}</p>
          <p className="text-sm text-slate-500">کل غیبت</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-amber-600">{lateTotal}</p>
          <p className="text-sm text-slate-500">کل تأخیر</p>
        </div>
      </div>
      <select
        value={classFilter}
        onChange={(e) => setClassFilter(e.target.value)}
        className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
      >
        <option value="">همه کلاس‌ها</option>
        {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-right">کلاس</th>
              <th className="px-4 py-3 text-right">معلم</th>
              <th className="px-4 py-3 text-right">تعداد دانش‌آموز</th>
              <th className="px-4 py-3 text-right">ارزشیابی</th>
              <th className="px-4 py-3 text-right">حضور / غیبت / تأخیر</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => {
              const teacher = data.users.find((u) => u.id === c.teacherId);
              const students = data.students.filter((s) => s.classId === c.id);
              const studentIds = students.map((s) => s.id);
              const assessments = data.assessments.filter((a) => studentIds.includes(a.studentId)).length;
              const att = data.attendance.filter((a) => studentIds.includes(a.studentId));
              return (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{c.name} (پایه {c.grade})</td>
                  <td className="px-4 py-3">{teacher?.name || "—"}</td>
                  <td className="px-4 py-3">{students.length}</td>
                  <td className="px-4 py-3">{assessments}</td>
                  <td className="px-4 py-3">
                    <span className="text-emerald-600">{att.filter((a) => a.status === "present").length}</span> /
                    <span className="text-rose-600">{att.filter((a) => a.status === "absent").length}</span> /
                    <span className="text-amber-600">{att.filter((a) => a.status === "late").length}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManageUsers({
  data,
  updateData,
  showNotice,
  session,
}: {
  data: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  showNotice: (m: string) => void;
  session: User;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<User["role"]>("teacher");

  const addUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password) return;
    if (data.users.some((u) => u.username === username)) {
      alert("این نام کاربری قبلاً ثبت شده است.");
      return;
    }
    updateData((d) => ({
      ...d,
      users: [
        ...d.users,
        {
          id: generateId(),
          username,
          password,
          role,
          name,
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: session.id,
        },
      ],
    }));
    setName("");
    setUsername("");
    setPassword("");
    showNotice(role === "admin" ? "مدیر جدید ثبت شد." : "معلم جدید ثبت شد.");
  };

  const isDefaultAdmin = (user: User) => user.id === "admin_default";
  const canManageUser = (target: User) => {
    // مدیر اصلی (kian) می‌تواند همه را مدیریت کند
    if (isDefaultAdmin(session)) return true;
    // سایر مدیران فقط معلمان را می‌توانند مدیریت کنند
    return target.role === "teacher";
  };

  const toggleActive = (id: string) => {
    const target = data.users.find((u) => u.id === id);
    if (!target) return;
    if (!canManageUser(target)) {
      alert("شما اجازه مدیریت این کاربر را ندارید.");
      return;
    }
    updateData((d) => ({
      ...d,
      users: d.users.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)),
    }));
  };

  const removeUser = (id: string) => {
    const target = data.users.find((u) => u.id === id);
    if (!target) return;
    if (!canManageUser(target)) {
      alert("شما اجازه حذف این کاربر را ندارید.");
      return;
    }
    if (!confirm("آیا از حذف این کاربر اطمینان دارید؟")) return;
    updateData((d) => ({
      ...d,
      users: d.users.filter((u) => u.id !== id),
      classes: d.classes.filter((c) => c.teacherId !== id),
    }));
    showNotice("کاربر حذف شد.");
  };

  const allUsers = isDefaultAdmin(session)
    ? data.users.filter((u) => u.id !== "admin_default")
    : data.users.filter((u) => u.createdBy === session.id);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">مدیریت کاربران</h2>
      <p className="text-sm text-slate-500">در این بخش می‌توانید مدیران و معلمان را اضافه، حذف یا فعال/غیرفعال کنید.</p>
      <form onSubmit={addUser} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-slate-800">افزودن کاربر جدید</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام و نام خانوادگی"
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
          />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="نام کاربری"
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="رمز عبور"
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as User["role"])}
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
          >
            <option value="teacher">معلم</option>
            <option value="admin">مدیر</option>
          </select>
        </div>
        <button type="submit" className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700">
          ثبت کاربر
        </button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-right">نام</th>
              <th className="px-4 py-3 text-right">نام کاربری</th>
              <th className="px-4 py-3 text-right">نقش</th>
              <th className="px-4 py-3 text-right">وضعیت</th>
              <th className="px-4 py-3 text-right">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3">{u.username}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-lg px-2 py-1 text-xs font-medium ${u.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                    {u.role === "admin" ? "مدیر" : "معلم"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-lg px-2 py-1 text-xs font-medium ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {u.isActive ? "فعال" : "غیرفعال"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {canManageUser(u) ? (
                      <>
                        <button
                          onClick={() => toggleActive(u.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                            u.isActive ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          }`}
                        >
                          {u.isActive ? "قطع دسترسی" : "وصل دسترسی"}
                        </button>
                        <button
                          onClick={() => removeUser(u.id)}
                          className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          حذف
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">غیرقابل تغییر</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {allUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  کاربری ثبت نشده است.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BackupRestore({
  data,
  updateData,
  showNotice,
}: {
  data: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  showNotice: (m: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const doRestore = async (file: File) => {
    try {
      const restored = await readJSONFile(file);
      if (!restored.users || !Array.isArray(restored.users)) throw new Error("invalid");
      if (!restored.users.find((u) => u.username === "admin")) {
        restored.users.unshift(defaultAdmin);
      }
      updateData(() => restored);
      showNotice("اطلاعات با موفقیت بازیابی شد.");
    } catch {
      alert("فایل پشتیبان نامعتبر است.");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">پشتیبان‌گیری و بازیابی</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-2 font-bold text-slate-800">دانلود نسخه پشتیبان</h3>
          <p className="mb-4 text-sm text-slate-500">تمام اطلاعات به صورت فایل JSON ذخیره می‌شود.</p>
          <button
            onClick={() => exportToJSON(data, `backup_${todayJalali().replace(/\//g, "-")}.json`)}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 font-medium text-white hover:bg-emerald-700"
          >
            دانلود JSON
          </button>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-2 font-bold text-slate-800">بازیابی اطلاعات</h3>
          <p className="mb-4 text-sm text-slate-500">فایل پشتیبان JSON را انتخاب کنید.</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) doRestore(file);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-4 file:py-2.5 file:font-medium file:text-indigo-700"
          />
        </div>
      </div>
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
        <p className="text-sm text-amber-800">
          <strong>نکته امنیتی:</strong> این سیستم تمام اطلاعات را در حافظه مرورگر (LocalStorage) ذخیره می‌کند. توصیه می‌شود به صورت دوره‌ای از اطلاعات پشتیبان تهیه کنید تا در صورت پاک‌شدن مرورگر، داده‌ها از دست نرود.
        </p>
      </div>
    </div>
  );
}

function TeacherContent({
  view,
  data,
  updateData,
  teacherId,
  showNotice,
  session,
}: {
  view: View;
  data: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  teacherId: string;
  showNotice: (m: string) => void;
  session: User;
}) {
  const teacherClasses = useMemo(() => data.classes.filter((c) => c.teacherId === teacherId), [data.classes, teacherId]);

  switch (view) {
    case "classes":
      return <ManageClasses data={data} updateData={updateData} teacherId={teacherId} showNotice={showNotice} />;
    case "students":
      return <ManageStudents data={data} updateData={updateData} teacherClasses={teacherClasses} showNotice={showNotice} teacherId={teacherId} />;
    case "attendance":
      return <AttendanceManager data={data} updateData={updateData} teacherClasses={teacherClasses} showNotice={showNotice} />;
    case "assessments":
      return <AssessmentManager data={data} updateData={updateData} teacherClasses={teacherClasses} showNotice={showNotice} />;
    case "behaviors":
      return <BehaviorManager data={data} updateData={updateData} teacherClasses={teacherClasses} showNotice={showNotice} />;
    case "schedule":
      return <ScheduleManager data={data} updateData={updateData} teacherClasses={teacherClasses} showNotice={showNotice} />;
    case "reports":
      return <ReportCards data={data} teacherClasses={teacherClasses} />;
    case "exams":
      return <ExamManager data={data} updateData={updateData} teacherClasses={teacherClasses} showNotice={showNotice} teacherId={teacherId} />;
    case "messages":
      return <MessageManager data={data} updateData={updateData} currentUser={session} />;
    default:
      return <TeacherDashboard data={data} teacherClasses={teacherClasses} />;
  }
}

function StudentPanel({ data, studentUser }: { data: AppData; studentUser: User }) {
  const student = data.students.find((s) => s.id === studentUser.studentId);
  if (!student) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-500">اطلاعات دانش‌آموز یافت نشد.</p>
      </div>
    );
  }
  const cls = data.classes.find((c) => c.id === student.classId);
  const attendance = data.attendance.filter((a) => a.studentId === student.id);
  const assessments = data.assessments.filter((a) => a.studentId === student.id);
  const presentDays = attendance.filter((a) => a.status === "present").length;
  const absentDays = attendance.filter((a) => a.status === "absent").length;
  const lateDays = attendance.filter((a) => a.status === "late").length;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">پنل دانش‌آموز</h2>
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-slate-800">اطلاعات شخصی</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">نام و نام خانوادگی</p>
            <p className="font-bold text-slate-900">{student.fullName}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">کلاس</p>
            <p className="font-bold text-slate-900">{cls?.name || "—"}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-emerald-600">{presentDays}</p>
          <p className="text-sm text-slate-500">حاضر</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-rose-600">{absentDays}</p>
          <p className="text-sm text-slate-500">غایب</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-amber-600">{lateDays}</p>
          <p className="text-sm text-slate-500">تأخیر</p>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-slate-800">ارزشیابی‌ها</h3>
        {assessments.length === 0 ? (
          <p className="text-slate-500">ثبت نشده</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-right">درس</th>
                  <th className="px-4 py-3 text-right">ارزشیابی</th>
                  <th className="px-4 py-3 text-right">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{a.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-lg px-2 py-1 text-xs font-medium ${a.type === "numeric" ? "bg-violet-100 text-violet-700" : DESCRIPTIVE_LEVELS.find((l) => l.value === a.value)?.color || "bg-slate-100 text-slate-700"}`}>
                        {a.value} {a.type === "numeric" ? "نمره" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">{a.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TeacherDashboard({ data, teacherClasses }: { data: AppData; teacherClasses: SchoolClass[] }) {
  const myStudents = data.students.filter((s) => teacherClasses.some((c) => c.id === s.classId));
  const stats = [
    { label: "کلاس‌ها", value: teacherClasses.length },
    { label: "دانش‌آموزان", value: myStudents.length },
    { label: "حضور امروز", value: data.attendance.filter((a) => a.date === todayJalali() && myStudents.some((s) => s.id === a.studentId)).length },
    { label: "ارزشیابی‌ها", value: data.assessments.filter((a) => myStudents.some((s) => s.id === a.studentId)).length },
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">داشبورد معلم</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-3xl font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold text-slate-800">کلاس‌های شما</h3>
        {teacherClasses.length === 0 ? (
          <p className="text-slate-500">هنوز کلاسی ثبت نکرده‌اید.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teacherClasses.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="font-bold text-slate-800">{c.name}</p>
                <p className="text-sm text-slate-500">پایه {c.grade}</p>
                <p className="text-sm text-slate-500">{data.students.filter((s) => s.classId === c.id).length} دانش‌آموز</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ManageClasses({
  data,
  updateData,
  teacherId,
  showNotice,
}: {
  data: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  teacherId: string;
  showNotice: (m: string) => void;
}) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<number>(1);
  const [subjects, setSubjects] = useState<string[]>([]);

  const toggleSubject = (subject: string) => {
    setSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    updateData((d) => ({
      ...d,
      classes: [
        ...d.classes,
        {
          id: generateId(),
          name,
          grade,
          teacherId,
          subjects,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setName("");
    setGrade(1);
    setSubjects([]);
    showNotice("کلاس ثبت شد.");
  };

  const remove = (id: string) => {
    if (!confirm("حذف کلاس باعث حذف دانش‌آموزان و سوابق مرتبط می‌شود. ادامه می‌دهید؟")) return;
    updateData((d) => ({
      ...d,
      classes: d.classes.filter((c) => c.id !== id),
      students: d.students.filter((s) => s.classId !== id),
      attendance: d.attendance.filter((a) => !d.students.find((s) => s.id === a.studentId && s.classId === id)),
      assessments: d.assessments.filter((a) => !d.students.find((s) => s.id === a.studentId && s.classId === id)),
      behaviors: d.behaviors.filter((b) => !d.students.find((s) => s.id === b.studentId && s.classId === id)),
      schedules: d.schedules.filter((s) => s.classId !== id),
    }));
    showNotice("کلاس حذف شد.");
  };

  const myClasses = data.classes.filter((c) => c.teacherId === teacherId);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">مدیریت کلاس‌ها</h2>
      <form onSubmit={add} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام کلاس (مثلاً ۷/۱)"
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
          />
          <select
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
          >
            {gradeOptions.map((g) => (
              <option key={g} value={g}>پایه {g}</option>
            ))}
          </select>
        </div>
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">درس‌های کلاس (چند مورد را می‌توانید انتخاب کنید)</label>
          <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {COMMON_SUBJECTS.map((s) => (
                <label
                  key={s}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    subjects.includes(s)
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={subjects.includes(s)}
                    onChange={() => toggleSubject(s)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="truncate">{s}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        {subjects.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {subjects.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">
                {s}
                <button
                  type="button"
                  onClick={() => toggleSubject(s)}
                  className="text-indigo-500 hover:text-indigo-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <button type="submit" className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700">
          ثبت کلاس
        </button>
      </form>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {myClasses.map((c) => (
          <div key={c.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900">{c.name}</h3>
                <p className="text-sm text-slate-500">پایه {c.grade}</p>
              </div>
              <button onClick={() => remove(c.id)} className="text-rose-500 hover:text-rose-700">🗑</button>
            </div>
            <p className="text-sm text-slate-600">
              <span className="font-medium">درس‌ها:</span> {c.subjects.join("، ") || "—"}
            </p>
            <p className="mt-2 text-sm text-slate-500">{data.students.filter((s) => s.classId === c.id).length} دانش‌آموز</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManageStudents({
  data,
  updateData,
  teacherClasses,
  showNotice,
  teacherId,
}: {
  data: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  teacherClasses: SchoolClass[];
  showNotice: (m: string) => void;
  teacherId: string;
}) {
  const [form, setForm] = useState<Partial<Student>>({});
  const [selectedClass, setSelectedClass] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !selectedClass) return;
    const studentId = generateId();
    updateData((d) => {
      const newStudent = {
        id: studentId,
        fullName: form.fullName || "",
        nationalId: form.nationalId || "",
        fatherName: form.fatherName || "",
        phone: form.phone || "",
        address: form.address || "",
        birthDate: form.birthDate || "",
        classId: selectedClass,
        createdAt: new Date().toISOString(),
      };
      const newUsers = [...d.users];
      if (form.nationalId) {
        // remove existing student account with same nationalId to avoid duplicates
        const existingIndex = newUsers.findIndex((u) => u.username === form.nationalId);
        if (existingIndex >= 0) newUsers.splice(existingIndex, 1);
        newUsers.push({
          id: generateId(),
          username: form.nationalId || "",
          password: form.nationalId || "",
          role: "student" as User["role"],
          name: form.fullName || "",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: teacherId,
          studentId,
        });
      }
      return {
        ...d,
        students: [...d.students, newStudent],
        users: newUsers,
      };
    });
    setForm({});
    showNotice("دانش‌آموز ثبت شد.");
  };

  const remove = (id: string) => {
    if (!confirm("آیا از حذف دانش‌آموز اطمینان دارید؟")) return;
    updateData((d) => ({
      ...d,
      students: d.students.filter((s) => s.id !== id),
      users: d.users.filter((u) => u.studentId !== id),
      attendance: d.attendance.filter((a) => a.studentId !== id),
      assessments: d.assessments.filter((a) => a.studentId !== id),
      behaviors: d.behaviors.filter((b) => b.studentId !== id),
    }));
    showNotice("دانش‌آموز حذف شد.");
  };

  const myStudents = data.students.filter((s) => teacherClasses.some((c) => c.id === s.classId));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">مدیریت دانش‌آموزان</h2>
      <form onSubmit={add} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
          >
            <option value="">انتخاب کلاس</option>
            {teacherClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.name} (پایه {c.grade})</option>
            ))}
          </select>
          <input
            value={form.fullName || ""}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="نام و نام خانوادگی"
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
          />
          <input
            value={form.nationalId || ""}
            onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
            placeholder="کد ملی"
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
          />
          <input
            value={form.fatherName || ""}
            onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
            placeholder="نام پدر"
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
          />
          <input
            value={form.phone || ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="شماره تماس والدین"
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
          />
          <input
            value={form.birthDate || ""}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            placeholder="تاریخ تولد (۱۳۸۰/۰۱/۰۱)"
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
          />
          <input
            value={form.address || ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="آدرس"
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500 md:col-span-2 lg:col-span-3"
          />
        </div>
        <button type="submit" className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700">
          ثبت دانش‌آموز
        </button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-right">نام</th>
              <th className="px-4 py-3 text-right">کلاس</th>
              <th className="px-4 py-3 text-right">کد ملی</th>
              <th className="px-4 py-3 text-right">تماس</th>
              <th className="px-4 py-3 text-right">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {myStudents.map((s) => {
              const cls = data.classes.find((c) => c.id === s.classId);
              return (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{s.fullName}</td>
                  <td className="px-4 py-3">{cls?.name || "—"}</td>
                  <td className="px-4 py-3">{s.nationalId || "—"}</td>
                  <td className="px-4 py-3">{s.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove(s.id)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100">
                      حذف
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttendanceManager({
  data,
  updateData,
  teacherClasses,
  showNotice,
}: {
  data: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  teacherClasses: SchoolClass[];
  showNotice: (m: string) => void;
}) {
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(todayJalali());

  const students = data.students.filter((s) => s.classId === classId);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    updateData((d) => {
      const filtered = d.attendance.filter((a) => !(a.studentId === studentId && a.date === date));
      return { ...d, attendance: [...filtered, { id: generateId(), studentId, date, status }] };
    });
    showNotice("وضعیت ثبت شد.");
  };

  const getStatus = (studentId: string): AttendanceStatus | undefined => {
    return data.attendance.find((a) => a.studentId === studentId && a.date === date)?.status;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">حضور و غیاب</h2>
      <div className="flex flex-wrap gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
        >
          <option value="">انتخاب کلاس</option>
          {teacherClasses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          value={date}
          onChange={(e) => setDate(e.target.value)}
          placeholder="تاریخ (۱۴۰۳/۰۱/۰۱)"
          className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
        />
      </div>
      {classId && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          {students.length === 0 ? (
            <p className="text-slate-500">دانش‌آموزی در این کلاس ثبت نشده است.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {students.map((s) => {
                const status = getStatus(s.id);
                return (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <span className="font-medium text-slate-800">{s.fullName}</span>
                    <div className="flex gap-2">
                      {(["present", "absent", "late", "leave"] as AttendanceStatus[]).map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatus(s.id, st)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                            status === st
                              ? ATTENDANCE_COLORS[st] + " border-current"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {ATTENDANCE_LABELS[st]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AssessmentManager({
  data,
  updateData,
  teacherClasses,
  showNotice,
}: {
  data: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  teacherClasses: SchoolClass[];
  showNotice: (m: string) => void;
}) {
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [value, setValue] = useState("");
  const [comment, setComment] = useState("");

  const cls = data.classes.find((c) => c.id === classId);
  const students = data.students.filter((s) => s.classId === classId);
  const isDescriptive = !cls || cls.grade <= 6;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !subject || !value) return;
    const type: AssessmentType = cls && cls.grade >= 7 ? "numeric" : "descriptive";
    updateData((d) => ({
      ...d,
      assessments: [
        ...d.assessments,
        {
          id: generateId(),
          studentId,
          subject,
          type,
          value,
          comment,
          date: todayJalali(),
        },
      ],
    }));
    setValue("");
    setComment("");
    showNotice("ارزشیابی ثبت شد.");
  };

  const remove = (id: string) => {
    if (!confirm("حذف شود؟")) return;
    updateData((d) => ({ ...d, assessments: d.assessments.filter((a) => a.id !== id) }));
    showNotice("حذف شد.");
  };

  const filteredAssessments = data.assessments.filter((a) => students.some((s) => s.id === a.studentId));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">ارزشیابی توصیفی / نمره‌ای</h2>
      <form onSubmit={add} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setStudentId("");
              setSubject("");
            }}
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
          >
            <option value="">انتخاب کلاس</option>
            {teacherClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.name} (پایه {c.grade})</option>
            ))}
          </select>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
            disabled={!classId}
          >
            <option value="">انتخاب دانش‌آموز</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.fullName}</option>
            ))}
          </select>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
            disabled={!classId}
          >
            <option value="">انتخاب درس</option>
            {cls?.subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {isDescriptive ? (
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
            >
              <option value="">انتخاب سطح عملکرد</option>
              {DESCRIPTIVE_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.value}</option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              min={0}
              max={20}
              step={0.25}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="نمره ۰ تا ۲۰"
              className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
            />
          )}
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="بازخورد معلم (اختیاری)"
            className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500 md:col-span-2 lg:col-span-3"
          />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {isDescriptive
            ? "پایه‌های ۱ تا ۶: ارزشیابی توصیفی (خیلی خوب، خوب، قابل قبول، نیاز به تلاش)"
            : "پایه‌های ۷ تا ۹: نمره ۰ تا ۲۰"}
        </p>
        <button type="submit" className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700">
          ثبت ارزشیابی
        </button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-right">دانش‌آموز</th>
              <th className="px-4 py-3 text-right">درس</th>
              <th className="px-4 py-3 text-right">ارزشیابی</th>
              <th className="px-4 py-3 text-right">تاریخ</th>
              <th className="px-4 py-3 text-right">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssessments.map((a) => {
              const student = data.students.find((s) => s.id === a.studentId);
              return (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{student?.fullName || "—"}</td>
                  <td className="px-4 py-3">{a.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-lg px-2 py-1 text-xs font-medium ${a.type === "numeric" ? "bg-violet-100 text-violet-700" : DESCRIPTIVE_LEVELS.find((l) => l.value === a.value)?.color || "bg-slate-100 text-slate-700"}`}>
                      {a.value} {a.type === "numeric" ? "نمره" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3">{a.date}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove(a.id)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100">
                      حذف
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BehaviorManager({
  data,
  updateData,
  teacherClasses,
  showNotice,
}: {
  data: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  teacherClasses: SchoolClass[];
  showNotice: (m: string) => void;
}) {
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState<"reward" | "penalty">("reward");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const students = data.students.filter((s) => s.classId === classId);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !title) return;
    updateData((d) => ({
      ...d,
      behaviors: [
        ...d.behaviors,
        { id: generateId(), studentId, type, title, description, date: todayJalali() },
      ],
    }));
    setTitle("");
    setDescription("");
    showNotice("ثبت شد.");
  };

  const remove = (id: string) => {
    if (!confirm("حذف شود؟")) return;
    updateData((d) => ({ ...d, behaviors: d.behaviors.filter((b) => b.id !== id) }));
    showNotice("حذف شد.");
  };

  const filtered = data.behaviors.filter((b) => students.some((s) => s.id === b.studentId));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">پرونده رفتاری</h2>
      <form onSubmit={add} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <select value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId(""); }} className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500">
            <option value="">انتخاب کلاس</option>
            {teacherClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!classId} className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500">
            <option value="">انتخاب دانش‌آموز</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value as "reward" | "penalty")} className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500">
            <option value="reward">تشویق</option>
            <option value="penalty">تذکر</option>
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان" className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیحات" className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500 md:col-span-2 lg:col-span-3" />
        </div>
        <button type="submit" className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700">ثبت</button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-right">دانش‌آموز</th>
              <th className="px-4 py-3 text-right">نوع</th>
              <th className="px-4 py-3 text-right">عنوان</th>
              <th className="px-4 py-3 text-right">تاریخ</th>
              <th className="px-4 py-3 text-right">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const student = data.students.find((s) => s.id === b.studentId);
              return (
                <tr key={b.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{student?.fullName || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-lg px-2 py-1 text-xs font-medium ${b.type === "reward" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {b.type === "reward" ? "تشویق" : "تذکر"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{b.title}</td>
                  <td className="px-4 py-3">{b.date}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove(b.id)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100">حذف</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScheduleManager({
  data,
  updateData,
  teacherClasses,
  showNotice,
}: {
  data: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  teacherClasses: SchoolClass[];
  showNotice: (m: string) => void;
}) {
  const [classId, setClassId] = useState("");
  const [dayIndex, setDayIndex] = useState(0);
  const [subject, setSubject] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const cls = data.classes.find((c) => c.id === classId);
  const items = data.schedules.filter((s) => s.classId === classId);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || !subject || !start || !end) return;
    updateData((d) => ({
      ...d,
      schedules: [...d.schedules, { id: generateId(), classId, dayIndex, subject, startTime: start, endTime: end }],
    }));
    setSubject("");
    setStart("");
    setEnd("");
    showNotice("برنامه ثبت شد.");
  };

  const remove = (id: string) => {
    updateData((d) => ({ ...d, schedules: d.schedules.filter((s) => s.id !== id) }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">برنامه هفتگی</h2>
      <form onSubmit={add} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-6">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500 md:col-span-2">
            <option value="">انتخاب کلاس</option>
            {teacherClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={dayIndex} onChange={(e) => setDayIndex(Number(e.target.value))} className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500">
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!classId} className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500">
            <option value="">درس</option>
            {cls?.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500" />
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500" />
        </div>
        <button type="submit" className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700">افزودن</button>
      </form>
      {classId && (
        <div className="grid gap-4 md:grid-cols-2">
          {DAYS.map((day, i) => {
            const dayItems = items.filter((it) => it.dayIndex === i).sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <div key={day} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <h3 className="mb-3 font-bold text-slate-800">{day}</h3>
                {dayItems.length === 0 ? (
                  <p className="text-sm text-slate-400">برنامه‌ای ثبت نشده</p>
                ) : (
                  <ul className="space-y-2">
                    {dayItems.map((it) => (
                      <li key={it.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                        <span>{it.subject}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">{it.startTime} - {it.endTime}</span>
                          <button onClick={() => remove(it.id)} className="text-rose-500 hover:text-rose-700">×</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReportCards({ data, teacherClasses }: { data: AppData; teacherClasses: SchoolClass[] }) {
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const cls = data.classes.find((c) => c.id === classId);
  const students = data.students.filter((s) => s.classId === classId);
  const student = data.students.find((s) => s.id === studentId);

  const attendance = data.attendance.filter((a) => a.studentId === studentId);
  const assessments = data.assessments.filter((a) => a.studentId === studentId);
  const behaviors = data.behaviors.filter((b) => b.studentId === studentId);

  const presentDays = attendance.filter((a) => a.status === "present").length;
  const absentDays = attendance.filter((a) => a.status === "absent").length;
  const lateDays = attendance.filter((a) => a.status === "late").length;

  const exportCSV = () => {
    if (!student) return;
    const rows = assessments.map((a) => ({
      "نام دانش‌آموز": student.fullName,
      "کلاس": cls?.name || "",
      "درس": a.subject,
      "نوع ارزشیابی": a.type === "numeric" ? "نمره‌ای" : "توصیفی",
      "مقدار": a.value,
      "بازخورد": a.comment || "",
      "تاریخ": a.date,
    }));
    exportToCSV(rows, `karname_${student.fullName}.csv`);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">کارنامه و گزارش</h2>
      <div className="flex flex-wrap gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm no-print">
        <select value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId(""); }} className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500">
          <option value="">انتخاب کلاس</option>
          {teacherClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!classId} className="rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500">
          <option value="">انتخاب دانش‌آموز</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
        </select>
        {student && (
          <>
            <button onClick={() => window.print()} className="rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700">🖨️ چاپ کارنامه</button>
            <button onClick={exportCSV} className="rounded-xl bg-emerald-600 px-6 py-2.5 font-medium text-white hover:bg-emerald-700">📥 خروجی CSV</button>
          </>
        )}
      </div>
      {student && cls && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 border-b border-slate-200 pb-6 text-center">
            <h3 className="text-2xl font-bold text-slate-900">کارنامه دانش‌آموز</h3>
            <p className="mt-2 text-slate-500">سال تحصیلی ۱۴۰۳ - ۱۴۰۴</p>
          </div>
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-slate-500">نام و نام خانوادگی</p>
              <p className="text-lg font-semibold text-slate-900">{student.fullName}</p>
            </div>
            <div>
              <p className="text-slate-500">کلاس / پایه</p>
              <p className="text-lg font-semibold text-slate-900">{cls.name} - پایه {cls.grade}</p>
            </div>
            <div>
              <p className="text-slate-500">نام پدر</p>
              <p className="font-semibold text-slate-900">{student.fatherName || "—"}</p>
            </div>
            <div>
              <p className="text-slate-500">تاریخ تولد</p>
              <p className="font-semibold text-slate-900">{student.birthDate || "—"}</p>
            </div>
          </div>
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-emerald-50 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">{presentDays}</p>
              <p className="text-sm text-emerald-600">حاضر</p>
            </div>
            <div className="rounded-xl bg-rose-50 p-4 text-center">
              <p className="text-2xl font-bold text-rose-700">{absentDays}</p>
              <p className="text-sm text-rose-600">غایب</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{lateDays}</p>
              <p className="text-sm text-amber-600">تأخیر</p>
            </div>
          </div>
          <div className="mb-6">
            <h4 className="mb-3 font-bold text-slate-800">ارزشیابی‌ها</h4>
            {assessments.length === 0 ? (
              <p className="text-slate-500">ثبت نشده</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-right">درس</th>
                      <th className="px-4 py-3 text-right">ارزشیابی</th>
                      <th className="px-4 py-3 text-right">بازخورد معلم</th>
                      <th className="px-4 py-3 text-right">تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map((a) => (
                      <tr key={a.id} className="border-b border-slate-100">
                        <td className="px-4 py-3">{a.subject}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-lg px-2 py-1 text-xs font-medium ${a.type === "numeric" ? "bg-violet-100 text-violet-700" : DESCRIPTIVE_LEVELS.find((l) => l.value === a.value)?.color || "bg-slate-100"}`}>
                            {a.value} {a.type === "numeric" ? "نمره" : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3">{a.comment || "—"}</td>
                        <td className="px-4 py-3">{a.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {behaviors.length > 0 && (
            <div>
              <h4 className="mb-3 font-bold text-slate-800">پرونده رفتاری</h4>
              <ul className="space-y-2">
                {behaviors.map((b) => (
                  <li key={b.id} className={`rounded-xl px-4 py-3 text-sm ${b.type === "reward" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                    <strong>{b.type === "reward" ? "تشویق" : "تذکر"}:</strong> {b.title} - {b.description} ({b.date})
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-8 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
            <p>امضای مدیر / معلم: ____________________</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ExamManager({
  data,
  updateData,
  teacherClasses,
  showNotice,
  teacherId,
}: {
  data: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  teacherClasses: SchoolClass[];
  showNotice: (m: string) => void;
  teacherId: string;
}) {
  const downloadExamAsPNG = async () => {
    if (!examPreviewRef.current) return;
    try {
      const canvas = await html2canvas(examPreviewRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: examPreviewRef.current.scrollWidth,
        width: examPreviewRef.current.scrollWidth,
        height: examPreviewRef.current.scrollHeight,
      });
      const link = document.createElement("a");
      link.download = `exam_${title || "azmoon"}.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("خطا در دانلود تصویر. لطفاً دوباره تلاش کنید.");
      console.error(err);
    }
  };
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState(30);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showForm, setShowForm] = useState(false);
  const examPreviewRef = useRef<HTMLDivElement>(null);

  const cls = teacherClasses.find((c) => c.id === classId);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: generateId(),
        text: "",
        type: "multiple",
        options: ["", "", "", ""],
        correctAnswer: 0,
      },
    ]);
  };

  const updateQuestion = (qIndex: number, field: keyof Question, value: string | number | string[]) => {
    const updated = [...questions];
    const q = { ...updated[qIndex] };
    (q as Record<string, unknown>)[field] = value;
    updated[qIndex] = q;
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const removeQuestion = (qIndex: number) => {
    setQuestions(questions.filter((_, i) => i !== qIndex));
  };

  const saveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subject || !classId || questions.length === 0) {
      alert("لطفاً تمام فیلدها را پر کنید و حداقل یک سوال اضافه کنید.");
      return;
    }
    if (questions.some((q) => !q.text)) {
      alert("لطفاً متن تمام سوالات را وارد کنید.");
      return;
    }
    updateData((d) => ({
      ...d,
      exams: [
        ...d.exams,
        {
          id: generateId(),
          title,
          subject,
          classId,
          teacherId,
          questions,
          duration,
          isActive: true,
          createdAt: todayJalali(),
        },
      ],
    }));
    setTitle("");
    setSubject("");
    setClassId("");
    setQuestions([]);
    setShowForm(false);
    showNotice("آزمون با موفقیت ایجاد شد.");
  };

  const toggleExam = (examId: string) => {
    updateData((d) => ({
      ...d,
      exams: d.exams.map((e) => (e.id === examId ? { ...e, isActive: !e.isActive } : e)),
    }));
  };

  const deleteExam = (examId: string) => {
    if (!confirm("آیا از حذف این آزمون اطمینان دارید؟")) return;
    updateData((d) => ({
      ...d,
      exams: d.exams.filter((e) => e.id !== examId),
      examAttempts: d.examAttempts.filter((a) => a.examId !== examId),
    }));
    showNotice("آزمون حذف شد.");
  };

  const myExams = data.exams.filter((e) => e.teacherId === teacherId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">آزمون‌ها</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showForm ? "بستن فرم" : "+ آزمون جدید"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-slate-800">ایجاد آزمون جدید</h3>
          <form onSubmit={saveExam}>
            <div className="grid items-start gap-4 md:grid-cols-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان آزمون"
                className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-indigo-500"
              />
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSubject("");
                }}
                className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-indigo-500"
              >
                <option value="">انتخاب کلاس</option>
                {teacherClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} (پایه {c.grade})</option>
                ))}
              </select>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={!classId}
                className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-indigo-500"
              >
                <option value="">انتخاب درس</option>
                {cls?.subjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <div>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  placeholder="مدت زمان (دقیقه)"
                  className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-indigo-500"
                />
                <p className="mt-1 text-center text-xs text-slate-500">مدت زمان: {duration} دقیقه</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between no-print">
              <h4 className="font-bold text-slate-700">سوالات ({questions.length} سوال)</h4>
              <button
                type="button"
                onClick={addQuestion}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
              >
                + افزودن سوال
              </button>
            </div>

            <div className="mt-2 space-y-4 rounded-xl border border-slate-100 bg-white p-4">
              {questions.map((q, qIndex) => (
                <div key={q.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-bold text-slate-700">سوال {qIndex + 1}</span>
                    <div className="flex items-center gap-2 no-print">
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestion(qIndex, "type", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 md:w-auto"
                      >
                        <option value="multiple">چهارگزینه‌ای</option>
                        <option value="descriptive">تشریحی</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-100"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                  <input
                    value={q.text}
                    onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
                    placeholder="متن سوال"
                    className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500"
                  />
                  {q.type === "multiple" && (
                    <div className="grid gap-2 md:grid-cols-2">
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctAnswer === oIndex}
                            onChange={() => updateQuestion(qIndex, "correctAnswer", oIndex)}
                            className="h-5 w-5 text-indigo-600"
                          />
                          <input
                            value={opt}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            placeholder={`گزینه ${oIndex + 1}`}
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                          />
                        </div>
                      ))}
                      <p className="text-xs text-slate-500 md:col-span-2">✓ گزینه صحیح را با رادیو انتخاب کنید</p>
                    </div>
                  )}
                  {q.type === "descriptive" && (
                    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
                      محل پاسخ تشریحی...
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-3">
              <button type="submit" className="rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700">
                ذخیره آزمون
              </button>
              <button
                type="button"
                onClick={downloadExamAsPNG}
                className="rounded-xl bg-emerald-600 px-6 py-2.5 font-medium text-white hover:bg-emerald-700"
              >
                📷 دانلود PNG
              </button>
            </div>
          </form>

          <div ref={examPreviewRef} className="pointer-events-none absolute -left-[9999px] top-0 w-[800px] bg-white p-8 text-right">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900">{title || "عنوان آزمون"}</h2>
              <p className="mt-2 text-sm text-slate-600">
                درس: {subject || "—"} | کلاس: {cls?.name || "—"} | زمان: {duration} دقیقه
              </p>
            </div>
            <div className="mt-6 space-y-4">
              {questions.map((q, qIndex) => (
                <div key={q.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-3 font-bold text-slate-800">سوال {qIndex + 1}: {q.text || "..."}</p>
                  {q.type === "multiple" ? (
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="rounded-lg border border-slate-200 p-2 text-sm">
                          {String.fromCharCode(1706 + oIndex)}) {opt || "..."}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-400">
                      محل پاسخ تشریحی
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {myExams.length === 0 ? (
          <p className="text-slate-500">هنوز آزمونی ایجاد نشده است.</p>
        ) : (
          myExams.map((exam) => {
            const attempts = data.examAttempts.filter((a) => a.examId === exam.id);
            const graded = attempts.filter((a) => a.graded).length;
            return (
              <div key={exam.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{exam.title}</h3>
                    <p className="text-sm text-slate-500">{exam.subject} | {teacherClasses.find((c) => c.id === exam.classId)?.name || ""} | {exam.questions.length} سوال | {exam.duration} دقیقه</p>
                    <p className="text-xs text-slate-400">{exam.createdAt}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`rounded-lg px-2 py-1 text-xs font-medium ${exam.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {exam.isActive ? "فعال" : "غیرفعال"}
                    </span>
                    <button
                      onClick={() => toggleExam(exam.id)}
                      className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      {exam.isActive ? "غیرفعال کردن" : "فعال کردن"}
                    </button>
                    <button
                      onClick={() => deleteExam(exam.id)}
                      className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100"
                    >
                      حذف
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex gap-4 text-sm text-slate-600">
                  <span>📋 {attempts.length} نفر شرکت کرده‌اند</span>
                  <span>✅ {graded} نفر تصحیح شده</span>
                </div>

                {attempts.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-right">دانش‌آموز</th>
                          <th className="px-3 py-2 text-right">تاریخ</th>
                          <th className="px-3 py-2 text-right">وضعیت</th>
                          <th className="px-3 py-2 text-right">نمره</th>
                          <th className="px-3 py-2 text-right">عملیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attempts.map((att) => {
                          const student = data.students.find((s) => s.id === att.studentId);
                          const descriptiveCount = exam.questions.filter((q) => q.type === "descriptive").length;
                          const desScores = att.descriptiveScores || {};
                          const desTotal = Object.values(desScores).reduce((sum, v) => sum + (v || 0), 0);
                          const finalScore = att.score + desTotal;
                          const maxScore = exam.questions.filter((q) => q.type === "multiple").length * 1 + descriptiveCount * 10;

                          return (
                            <tr key={att.id} className="border-b border-slate-100">
                              <td className="px-3 py-2 font-medium">{student?.fullName || "—"}</td>
                              <td className="px-3 py-2">{att.submittedAt}</td>
                              <td className="px-3 py-2">
                                <span className={`rounded-lg px-2 py-1 text-xs font-medium ${att.graded ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                  {att.graded ? "تصحیح شده" : "در انتظار تصحیح"}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-bold">
                                {att.graded ? `${finalScore} از ${maxScore}` : "—"}
                              </td>
                              <td className="px-3 py-2">
                                <GradeExamModal exam={exam} attempt={att} updateData={updateData} showNotice={showNotice} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function GradeExamModal({
  exam,
  attempt,
  updateData,
  showNotice,
}: {
  exam: Exam;
  attempt: ExamAttempt;
  updateData: (fn: (d: AppData) => AppData) => void;
  showNotice: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [desScores, setDesScores] = useState<Record<string, number>>(attempt.descriptiveScores || {});

  const saveGrade = () => {
    updateData((d) => ({
      ...d,
      examAttempts: d.examAttempts.map((a) =>
        a.id === attempt.id ? { ...a, descriptiveScores: desScores, graded: true } : a
      ),
    }));
    setOpen(false);
    showNotice("نمره ثبت شد.");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
      >
        {attempt.graded ? "مشاهده" : "تصحیح"}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-bold text-slate-900">تصحیح آزمون</h3>

            <div className="space-y-4">
              {exam.questions.map((q, i) => {
                const isMultiple = q.type === "multiple";
                const userAnswer = attempt.answers[q.id] || "";
                const isCorrect = isMultiple && Number(userAnswer) === q.correctAnswer;
                return (
                  <div key={q.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="mb-2 font-medium text-slate-800">سوال {i + 1} ({isMultiple ? "چهارگزینه‌ای" : "تشریحی"}): {q.text}</p>
                    {isMultiple ? (
                      <div>
                        <p className="text-sm text-slate-600">پاسخ دانش‌آموز: گزینه {Number(userAnswer) + 1} ({q.options[Number(userAnswer)] || "—"})</p>
                        <p className="text-sm text-slate-600">پاسخ صحیح: گزینه {q.correctAnswer + 1} ({q.options[q.correctAnswer]})</p>
                        <p className={`mt-1 text-sm font-medium ${isCorrect ? "text-emerald-600" : "text-rose-600"}`}>
                          {isCorrect ? "✓ صحیح" : "✗ غلط"}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="mb-2 text-sm text-slate-600">پاسخ دانش‌آموز: {userAnswer || "—"}</p>
                        <label className="block text-sm text-slate-700">نمره تشریحی (از ۱۰):</label>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={desScores[q.id] || 0}
                          onChange={(e) => setDesScores({ ...desScores, [q.id]: Number(e.target.value) })}
                          className="mt-1 w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={saveGrade} className="rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700">
                ذخیره نمرات
              </button>
              <button onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-6 py-2.5 font-medium text-slate-700 hover:bg-slate-50">
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StudentExamPanel({
  data,
  updateData,
  studentUser,
}: {
  data: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  studentUser: User;
}) {
  const student = data.students.find((s) => s.id === studentUser.studentId);
  if (!student) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="mb-2 text-lg font-bold text-amber-800">⚠️ اطلاعات یافت نشد</h2>
        <p className="text-sm text-amber-700">حساب کاربری شما به اطلاعات دانش‌آموزی متصل نیست. لطفاً با مدیر سیستم تماس بگیرید.</p>
        <p className="mt-2 text-xs text-amber-600">کد خطا: studentId = {studentUser.studentId || "خالی"}</p>
      </div>
    );
  }

  const availableExams = data.exams.filter((e) => e.classId === student.classId && e.isActive);
  const myAttempts = data.examAttempts.filter((a) => a.studentId === student.id);

  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const startExam = (exam: Exam) => {
    const existingAttempt = myAttempts.find((a) => a.examId === exam.id);
    if (existingAttempt) {
      alert("شما قبلاً در این آزمون شرکت کرده‌اید.");
      return;
    }
    setActiveExam(exam);
    setAnswers({});
  };

  const submitExam = () => {
    if (!activeExam) return;

    let score = 0;
    activeExam.questions.forEach((q) => {
      if (q.type === "multiple" && Number(answers[q.id]) === q.correctAnswer) {
        score += 1;
      }
    });

    updateData((d) => ({
      ...d,
      examAttempts: [
        ...d.examAttempts,
        {
          id: generateId(),
          examId: activeExam.id,
          studentId: student.id,
          answers,
          score,
          totalQuestions: activeExam.questions.length,
          descriptiveScores: {},
          submittedAt: todayJalali(),
          graded: false,
        },
      ],
    }));
    setActiveExam(null);
    alert("آزمون با موفقیت ارسال شد.");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">آزمون‌ها</h2>
      <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
        کلاس شما: <span className="font-bold">{student.classId}</span> | آزمون‌های فعال: <span className="font-bold">{availableExams.length}</span> | کل آزمون‌های سیستم: <span className="font-bold">{data.exams.length}</span>
      </div>
      {data.exams.length > 0 && availableExams.length === 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
          ⚠️ آزمونی برای کلاس شما یافت نشد. ممکن است آزمون برای کلاس دیگری ساخته شده باشد یا هنوز فعال نشده باشد.
        </div>
      )}

      {activeExam ? (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-indigo-900">{activeExam.title}</h3>
              <p className="text-sm text-indigo-700">{activeExam.subject} | {activeExam.duration} دقیقه | {activeExam.questions.length} سوال</p>
            </div>
            <button
              onClick={() => { if (confirm("آیا از ارسال آزمون اطمینان دارید؟")) submitExam(); }}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 font-bold text-white hover:bg-indigo-700"
            >
              ارسال آزمون
            </button>
          </div>

          <div className="space-y-4">
            {activeExam.questions.map((q, i) => (
              <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-3 font-medium text-slate-800">سوال {i + 1}: {q.text}</p>
                {q.type === "multiple" ? (
                  <div className="space-y-2">
                    {q.options.map((opt, oIndex) => (
                      <label key={oIndex} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 transition ${answers[q.id] === String(oIndex) ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"}`}>
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={answers[q.id] === String(oIndex)}
                          onChange={() => setAnswers({ ...answers, [q.id]: String(oIndex) })}
                          className="h-4 w-4 text-indigo-600"
                        />
                        <span className="text-sm">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    rows={4}
                    placeholder="پاسخ خود را بنویسید..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => { if (confirm("آیا از ارسال آزمون اطمینان دارید؟")) submitExam(); }}
              className="rounded-xl bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-700"
            >
              ارسال و تکمیل آزمون
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {availableExams.length === 0 ? (
            <p className="text-slate-500">آزمون فعالی برای کلاس شما وجود ندارد.</p>
          ) : (
            availableExams.map((exam) => {
              const myAttempt = myAttempts.find((a) => a.examId === exam.id);
              return (
                <div key={exam.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{exam.title}</h3>
                      <p className="text-sm text-slate-500">{exam.subject} | {exam.questions.length} سوال | {exam.duration} دقیقه</p>
                      <p className="text-xs text-slate-400">تاریخ ایجاد: {exam.createdAt}</p>
                    </div>
                    <div>
                      {myAttempt ? (
                        <span className={`rounded-xl px-4 py-2 text-sm font-bold ${myAttempt.graded ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {myAttempt.graded ? `نمره: ${myAttempt.score} از ${exam.questions.filter((q) => q.type === "multiple").length}` : "در انتظار تصحیح"}
                        </span>
                      ) : (
                        <button
                          onClick={() => startExam(exam)}
                          className="rounded-xl bg-indigo-600 px-6 py-2.5 font-bold text-white hover:bg-indigo-700"
                        >
                          شروع آزمون
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {myAttempts.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 font-bold text-slate-800">آزمون‌های شرکت‌شده</h3>
              {myAttempts.map((att) => {
                const exam = data.exams.find((e) => e.id === att.examId);
                const descriptiveCount = exam?.questions.filter((q) => q.type === "descriptive").length || 0;
                const desScores = att.descriptiveScores || {};
                const desTotal = Object.values(desScores).reduce((sum, v) => sum + (v || 0), 0);
                const finalScore = att.score + desTotal;
                const maxScore = (exam?.questions.filter((q) => q.type === "multiple").length || 0) + descriptiveCount * 10;

                return (
                  <div key={att.id} className="mb-2 flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4">
                    <div>
                      <p className="font-medium text-slate-800">{exam?.title || "آزمون حذف شده"}</p>
                      <p className="text-xs text-slate-500">{att.submittedAt}</p>
                    </div>
                    <span className={`rounded-xl px-4 py-2 text-sm font-bold ${att.graded ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {att.graded ? `${finalScore} از ${maxScore}` : "در انتظار تصحیح"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageManager({
  data,
  updateData,
  currentUser,
}: {
  data: AppData;
  updateData: (fn: (d: AppData) => AppData) => void;
  currentUser: User;
}) {
  const [tab, setTab] = useState<"inbox" | "sent" | "compose">("inbox");
  const [receiverId, setReceiverId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const isMutedBy = (receiverId: string) => {
    return data.mutes.some((m) => m.muterId === receiverId && m.mutedId === currentUser.id);
  };

  const isMutedByMe = (userId: string) => {
    return data.mutes.some((m) => m.muterId === currentUser.id && m.mutedId === userId);
  };

  const canMute = (target: User) => {
    // سطح بالاتر می‌تواند سطح پایین‌تر را سکوت کند
    if (currentUser.role === "admin" && target.role !== "admin") return true;
    if (currentUser.role === "teacher" && target.role === "student") return true;
    return false;
  };

  const muteUser = (userId: string) => {
    if (data.mutes.some((m) => m.muterId === currentUser.id && m.mutedId === userId)) return;
    updateData((d) => ({
      ...d,
      mutes: [...d.mutes, { id: generateId(), muterId: currentUser.id, mutedId: userId }],
    }));
  };

  const unmuteUser = (userId: string) => {
    updateData((d) => ({
      ...d,
      mutes: d.mutes.filter((m) => !(m.muterId === currentUser.id && m.mutedId === userId)),
    }));
  };

  const getAvailableRecipients = () => {
    let list: User[] = [];
    if (currentUser.role === "admin") {
      if (currentUser.id === "admin_default") {
        list = data.users.filter((u) => u.id !== currentUser.id && u.isActive);
      } else {
        const defaultAdmin = data.users.find((u) => u.id === "admin_default");
        const createdTeachers = data.users.filter(
          (u) => u.role === "teacher" && u.isActive && u.createdBy === currentUser.id
        );
        const result: User[] = [];
        if (defaultAdmin) result.push(defaultAdmin);
        result.push(...createdTeachers);
        list = result;
      }
    } else if (currentUser.role === "teacher") {
      const admins = data.users.filter((u) => u.role === "admin" && u.isActive);
      const studentUsers = data.users.filter((u) => u.role === "student" && u.isActive && data.students.some((s) => s.id === u.studentId && data.classes.some((c) => c.id === s.classId && c.teacherId === currentUser.id)));
      list = [...admins, ...studentUsers];
    } else {
      // student
      const admins = data.users.filter((u) => u.role === "admin" && u.isActive);
      const teachers = data.users.filter((u) => u.role === "teacher" && u.isActive && data.classes.some((c) => c.teacherId === u.id && data.students.some((s) => s.id === currentUser.studentId && s.classId === c.id)));
      list = [...admins, ...teachers];
    }
    // فقط کسانی که من را سکوت نکرده‌اند
    return list.filter((u) => !isMutedBy(u.id));
  };

  const recipients = getAvailableRecipients();

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverId || !title || !content) return;
    updateData((d) => ({
      ...d,
      messages: [
        ...d.messages,
        {
          id: generateId(),
          senderId: currentUser.id,
          receiverId,
          title,
          content,
          date: todayJalali(),
          isRead: false,
        },
      ],
    }));
    setReceiverId("");
    setTitle("");
    setContent("");
    setTab("sent");
  };

  const markAsRead = (id: string) => {
    updateData((d) => ({
      ...d,
      messages: d.messages.map((m) => (m.id === id && m.receiverId === currentUser.id ? { ...m, isRead: true } : m)),
    }));
  };

  const inbox = data.messages.filter((m) => m.receiverId === currentUser.id).sort((a, b) => b.date.localeCompare(a.date));
  const sent = data.messages.filter((m) => m.senderId === currentUser.id).sort((a, b) => b.date.localeCompare(a.date));
  const unreadCount = inbox.filter((m) => !m.isRead).length;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">پیام‌ها {unreadCount > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-sm text-white">{unreadCount}</span>}</h2>
      <div className="flex gap-2">
        <button
          onClick={() => setTab("inbox")}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${tab === "inbox" ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          صندوق ورودی
        </button>
        <button
          onClick={() => setTab("sent")}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${tab === "sent" ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          ارسال‌شده
        </button>
        <button
          onClick={() => setTab("compose")}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${tab === "compose" ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          نوشتن پیام
        </button>
      </div>

      {tab === "compose" && (
        <form onSubmit={sendMessage} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">گیرنده</label>
              <select
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
              >
                <option value="">انتخاب گیرنده</option>
                {recipients.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.role === "admin" ? "(مدیر)" : u.role === "teacher" ? "(معلم)" : "(دانش‌آموز)"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">عنوان</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان پیام"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">متن پیام</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="متن پیام خود را بنویسید..."
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-indigo-500"
              />
            </div>
            <button type="submit" className="rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white hover:bg-indigo-700">
              ارسال پیام
            </button>
          </div>
        </form>
      )}

      {tab === "inbox" && (
        <div className="space-y-3">
          {inbox.length === 0 ? (
            <p className="text-slate-500">پیامی دریافت نشده است.</p>
          ) : (
            inbox.map((m) => {
              const sender = data.users.find((u) => u.id === m.senderId);
              return (
                <div
                  key={m.id}
                  onClick={() => markAsRead(m.id)}
                  className={`cursor-pointer rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${m.isRead ? "border-slate-100 bg-white" : "border-indigo-200 bg-indigo-50"}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${m.isRead ? "bg-slate-300" : "bg-indigo-500"}`} />
                      <span className="font-bold text-slate-800">{sender?.name || "نامشخص"}</span>
                      <span className="text-xs text-slate-500">{sender?.role === "admin" ? "مدیر" : sender?.role === "teacher" ? "معلم" : "دانش‌آموز"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {sender && canMute(sender) && (
                        isMutedByMe(sender.id) ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); unmuteUser(sender.id); }}
                            className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-100"
                          >
                            رفع سکوت
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); muteUser(sender.id); }}
                            className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                          >
                            سکوت
                          </button>
                        )
                      )}
                      <span className="text-xs text-slate-500">{m.date}</span>
                    </div>
                  </div>
                  <h3 className={`text-sm ${m.isRead ? "font-medium text-slate-700" : "font-bold text-slate-900"}`}>{m.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{m.content}</p>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "sent" && (
        <div className="space-y-3">
          {sent.length === 0 ? (
            <p className="text-slate-500">پیامی ارسال نشده است.</p>
          ) : (
            sent.map((m) => {
              const receiver = data.users.find((u) => u.id === m.receiverId);
              return (
                <div key={m.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">به: {receiver?.name || "نامشخص"}</span>
                      <span className="text-xs text-slate-500">{receiver?.role === "admin" ? "مدیر" : receiver?.role === "teacher" ? "معلم" : "دانش‌آموز"}</span>
                    </div>
                    <span className="text-xs text-slate-500">{m.date}</span>
                  </div>
                  <h3 className="text-sm font-medium text-slate-700">{m.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{m.content}</p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
