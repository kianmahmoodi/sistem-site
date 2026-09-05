export type UserRole = "admin" | "teacher" | "student";

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  name: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string; // id of creator or "system"
  studentId?: string; // for student accounts
}

export interface SchoolClass {
  id: string;
  name: string;
  grade: number;
  teacherId: string;
  subjects: string[];
  createdAt: string;
}

export interface Student {
  id: string;
  fullName: string;
  nationalId: string;
  fatherName: string;
  phone: string;
  address: string;
  birthDate: string;
  classId: string;
  createdAt: string;
}

export type AttendanceStatus = "present" | "absent" | "late" | "leave";

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // jalali yyyy/mm/dd
  status: AttendanceStatus;
  note?: string;
}

export type AssessmentType = "descriptive" | "numeric";

export interface Assessment {
  id: string;
  studentId: string;
  subject: string;
  type: AssessmentType;
  value: string; // descriptive text or numeric score
  comment?: string;
  date: string;
}

export interface BehaviorRecord {
  id: string;
  studentId: string;
  type: "reward" | "penalty";
  title: string;
  description: string;
  date: string;
}

export interface ScheduleItem {
  id: string;
  classId: string;
  dayIndex: number; // 0 = Shanbe, 6 = Jome
  subject: string;
  startTime: string;
  endTime: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  title: string;
  content: string;
  date: string;
  isRead: boolean;
}

export interface MuteRecord {
  id: string;
  muterId: string; // کاربری که سکوت کرده
  mutedId: string; // کاربری که سکوت شده
}

export type QuestionType = "multiple" | "descriptive";

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: string[]; // 4 options for multiple choice
  correctAnswer: number; // index 0-3 for multiple choice
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  classId: string;
  teacherId: string;
  questions: Question[];
  duration: number; // minutes
  isActive: boolean;
  createdAt: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  answers: Record<string, string>; // questionId -> answer
  score: number;
  totalQuestions: number;
  descriptiveScores: Record<string, number>; // questionId -> teacher score for descriptive
  submittedAt: string;
  graded: boolean;
}

export interface AppData {
  users: User[];
  classes: SchoolClass[];
  students: Student[];
  attendance: AttendanceRecord[];
  assessments: Assessment[];
  behaviors: BehaviorRecord[];
  schedules: ScheduleItem[];
  messages: Message[];
  mutes: MuteRecord[];
  exams: Exam[];
  examAttempts: ExamAttempt[];
}

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: "حاضر",
  absent: "غایب",
  late: "تأخیر",
  leave: "مرخص",
};

export const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  present: "bg-emerald-100 text-emerald-700 border-emerald-200",
  absent: "bg-rose-100 text-rose-700 border-rose-200",
  late: "bg-amber-100 text-amber-700 border-amber-200",
  leave: "bg-sky-100 text-sky-700 border-sky-200",
};

export const DESCRIPTIVE_LEVELS = [
  { value: "خیلی خوب", color: "bg-emerald-100 text-emerald-700" },
  { value: "خوب", color: "bg-blue-100 text-blue-700" },
  { value: "قابل قبول", color: "bg-amber-100 text-amber-700" },
  { value: "نیاز به تلاش", color: "bg-rose-100 text-rose-700" },
];

export const DAYS = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
];

export const COMMON_SUBJECTS = [
  "فارسی",
  "ریاضی",
  "علوم",
  "مطالعات اجتماعی",
  "قرآن",
  "هدیه‌های آسمانی",
  "انگلیسی",
  "زبان عربی",
  "تعلیمات اجتماعی و دینی",
  "کار و فناوری",
  "هنر",
  "تربیت بدنی",
  "سلامت",
  "رایانه",
  "فیزیک",
  "شیمی",
  "زیست‌شناسی",
  "تاریخ",
  "جغرافیا",
];
