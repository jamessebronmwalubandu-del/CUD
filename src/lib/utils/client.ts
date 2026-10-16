/**
 * Lightweight fetcher for our REST API.
 * Returns parsed JSON; throws Error on non-2xx responses.
 */

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

// Client-side in-memory cache to prevent duplicate fetches on tab navigation
interface ClientCacheEntry {
  data: unknown;
  timestamp: number;
}
const clientCache = new Map<string, ClientCacheEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const CLIENT_CACHE_TTL_MS = 20_000; // 20 seconds cache for identical GETs

export function invalidateClientCache(prefix?: string) {
  if (!prefix) {
    clientCache.clear();
    return;
  }
  for (const key of clientCache.keys()) {
    if (key.startsWith(prefix)) {
      clientCache.delete(key);
    }
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();

  // For GET requests, check in-memory client cache & deduplicate in-flight requests
  if (method === "GET" && options.cache !== "no-cache") {
    const cached = clientCache.get(url);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS) {
      return cached.data as T;
    }

    const existingPromise = inFlightRequests.get(url);
    if (existingPromise) {
      return existingPromise as Promise<T>;
    }
  }

  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (!isFormData && options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const exec = async (): Promise<T> => {
    try {
      const res = await fetch(url, {
        ...options,
        headers,
        credentials: "same-origin",
      });

      const isJson = res.headers.get("content-type")?.includes("application/json");
      const payload = isJson ? await res.json().catch(() => null) : null;

      if (!res.ok) {
        const message = payload?.error ?? res.statusText ?? "Request failed";
        throw new ApiError(res.status, message, payload?.details);
      }

      const result = (payload && typeof payload === "object" && "success" in payload && "data" in payload)
        ? (payload.data as T)
        : (payload as T);

      // Cache successful GET results
      if (method === "GET") {
        clientCache.set(url, { data: result, timestamp: Date.now() });
      } else {
        // Any mutation (POST, PUT, PATCH, DELETE) invalidates the client cache
        clientCache.clear();
      }

      return result;
    } finally {
      if (method === "GET") {
        inFlightRequests.delete(url);
      }
    }
  };

  if (method === "GET") {
    const p = exec();
    inFlightRequests.set(url, p);
    return p;
  }

  return exec();
}

export const api = {
  get: <T>(url: string, init?: RequestInit) =>
    request<T>(url, { ...init, method: "GET" }),
  post: <T>(url: string, body?: unknown, init?: RequestInit) =>
    request<T>(url, {
      ...init,
      method: "POST",
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(url: string, body?: unknown, init?: RequestInit) =>
    request<T>(url, {
      ...init,
      method: "PUT",
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(url: string, body?: unknown, init?: RequestInit) =>
    request<T>(url, {
      ...init,
      method: "PATCH",
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(url: string, init?: RequestInit) =>
    request<T>(url, { ...init, method: "DELETE" }),
  invalidateCache: invalidateClientCache,
};

/**
 * Formatters
 */

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, opts ?? { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(date: string | Date, locale: "en" | "sw" = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const sw_mode = locale === "sw";
  if (seconds < 60) return sw_mode ? "sasa hivi" : "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return sw_mode ? `dakika ${minutes} iliyopita` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return sw_mode ? `saa ${hours} iliyopita` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return sw_mode ? `siku ${days} iliyopita` : `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return sw_mode ? `wiki ${weeks} iliyopita` : `${weeks}w ago`;
  return formatDate(d);
}

/**
 * CUD (Catholic University of Dodoma) faculties, departments, and programmes.
 * Used to drive the cascading dropdowns when registering a new member.
 */
export type CudDepartment = { name: string; courses: string[] };
export type CudFaculty = { name: string; departments: CudDepartment[] };

export const CUD_FACULTIES: CudFaculty[] = [
  {
    name: "Faculty of Business and Economics",
    departments: [
      {
        name: "Department of Business Administration",
        courses: [
          "Bachelor of Business Administration (BBA)",
          "Bachelor of Commerce (BCom)",
          "Bachelor of Accounting & Finance",
        ],
      },
      {
        name: "Department of Economics",
        courses: [
          "Bachelor of Economics",
          "Bachelor of Economics and Statistics",
        ],
      },
    ],
  },
  {
    name: "Faculty of Education",
    departments: [
      {
        name: "Department of Arts & Social Sciences Education",
        courses: [
          "Bachelor of Education (Arts)",
          "Bachelor of Education (Social Sciences)",
        ],
      },
      {
        name: "Department of Science Education",
        courses: [
          "Bachelor of Education (Science)",
          "Bachelor of Education (Mathematics)",
        ],
      },
      {
        name: "Department of Early Childhood Education",
        courses: [
          "Bachelor of Early Childhood Education",
        ],
      },
    ],
  },
  {
    name: "Faculty of Law",
    departments: [
      {
        name: "Department of Law",
        courses: [
          "Bachelor of Laws (LLB)",
        ],
      },
    ],
  },
  {
    name: "Faculty of Information Technology and Computing",
    departments: [
      {
        name: "Department of Computer Science",
        courses: [
          "Bachelor of Science in Computer Science",
          "Bachelor of Science in Software Engineering",
          "Bachelor of Science in Information Technology",
        ],
      },
      {
        name: "Department of Information Systems",
        courses: [
          "Bachelor of Science in Information Systems",
          "Bachelor of Science in Computer Engineering",
        ],
      },
    ],
  },
  {
    name: "Faculty of Health Sciences",
    departments: [
      {
        name: "Department of Nursing",
        courses: [
          "Bachelor of Science in Nursing",
          "Bachelor of Science in Midwifery",
        ],
      },
      {
        name: "Department of Public Health",
        courses: [
          "Bachelor of Science in Environmental Health",
          "Bachelor of Science in Public Health",
        ],
      },
      {
        name: "Department of Clinical Medicine",
        courses: [
          "Bachelor of Medicine (Clinical)",
        ],
      },
    ],
  },
  {
    name: "Faculty of Social Sciences",
    departments: [
      {
        name: "Department of Sociology",
        courses: [
          "Bachelor of Arts in Sociology",
          "Bachelor of Arts in Social Work",
        ],
      },
      {
        name: "Department of Development Studies",
        courses: [
          "Bachelor of Arts in Development Studies",
        ],
      },
      {
        name: "Department of Communication & Media",
        courses: [
          "Bachelor of Arts in Mass Communication",
          "Bachelor of Arts in Journalism",
        ],
      },
    ],
  },
  {
    name: "Faculty of Natural and Applied Sciences",
    departments: [
      {
        name: "Department of Mathematics",
        courses: [
          "Bachelor of Science in Mathematics",
          "Bachelor of Science in Statistics",
        ],
      },
      {
        name: "Department of Chemistry",
        courses: [
          "Bachelor of Science in Chemistry",
          "Bachelor of Science in Biochemistry",
        ],
      },
      {
        name: "Department of Biology",
        courses: [
          "Bachelor of Science in Biology",
          "Bachelor of Science in Environmental Science",
        ],
      },
    ],
  },
  {
    name: "School of Postgraduate Studies",
    departments: [
      {
        name: "Postgraduate Programmes",
        courses: [
          "Master of Arts",
          "Master of Science",
          "Master of Business Administration (MBA)",
          "Doctor of Philosophy (PhD)",
        ],
      },
    ],
  },
];

export const CUD_FACULTY_NAMES = CUD_FACULTIES.map((f) => f.name);

export function getCudDepartments(facultyName: string): CudDepartment[] {
  return CUD_FACULTIES.find((f) => f.name === facultyName)?.departments ?? [];
}

export function getCudCourses(facultyName: string, departmentName: string): string[] {
  return (
    getCudDepartments(facultyName).find((d) => d.name === departmentName)?.courses ?? []
  );
}

export const LABELS = {
  role: { SUPER_ADMIN: "Super Admin", ADMIN: "Admin", MEMBER: "Member" } as Record<string, string>,
  gender: { MALE: "Male", FEMALE: "Female" } as Record<string, string>,
  year: {
    YEAR_1: "Year 1",
    YEAR_2: "Year 2",
    YEAR_3: "Year 3",
    YEAR_4: "Year 4",
    YEAR_5: "Year 5",
  } as Record<string, string>,
  status: { ACTIVE: "Active", INACTIVE: "Inactive", GRADUATED: "Graduated" } as Record<string, string>,
  skillStatus: { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" } as Record<string, string>,
  proficiency: {
    BEGINNER: "Beginner",
    INTERMEDIATE: "Intermediate",
    ADVANCED: "Advanced",
    EXPERT: "Expert",
  } as Record<string, string>,
  ministryRole: { LEADER: "Leader", ASSISTANT: "Assistant", MEMBER: "Member" } as Record<string, string>,
  audience: {
    ALL: "All Members",
    MINISTRY: "Ministry",
    COURSE: "Course",
    FACULTY: "Faculty",
    HOSTEL: "Hostel",
    CUSTOM: "Custom",
  } as Record<string, string>,
  priority: { LOW: "Low", NORMAL: "Normal", HIGH: "High", URGENT: "Urgent" } as Record<string, string>,
  eventStatus: {
    UPCOMING: "Upcoming",
    ONGOING: "Ongoing",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  } as Record<string, string>,
  attendanceType: {
    SUNDAY_FELLOWSHIP: "Sunday Fellowship",
    BIBLE_STUDY: "Bible Study",
    PRAYER_MEETING: "Prayer Meeting",
    CONFERENCE: "Conference",
    EVANGELISM: "Evangelism",
  } as Record<string, string>,
  documentCategory: {
    CONSTITUTION: "Constitution",
    MEETING_MINUTES: "Meeting Minutes",
    TIMETABLES: "Timetables",
    LETTERS: "Letters",
    FINANCIAL: "Financial",
    SCHEDULES: "Schedules",
    OTHER: "Other",
  } as Record<string, string>,
  accessLevel: {
    ALL: "All Members",
    ADMIN: "Admin Only",
    SUPER_ADMIN: "Super Admin Only",
    MINISTRY: "Ministry Members",
  } as Record<string, string>,
};

/**
 * Locale-aware label lookup.
 * Pass `t` (the i18n translation function) and an enum value.
 * Falls back to English LABELS if translation key missing.
 */
export function label(
  t: (key: string, params?: Record<string, string | number>) => string,
  category: keyof typeof LABELS,
  value: string
): string {
  const key = `enum.${category}.${value}`;
  const translated = t(key);
  // If translation missing, `t` returns the key itself — fall back to English LABELS
  if (translated === key) {
    return LABELS[category][value] ?? value;
  }
  return translated;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function isAssociateMember(member: {
  biography?: string | null;
  yearOfStudy?: string | null;
  status?: string | null;
} | null | undefined): boolean {
  if (!member) return false;
  if (member.status === "ASSOCIATE") return true;
  if (member.yearOfStudy === "ASSOCIATE" || member.yearOfStudy === "GRADUATED") return true;
  if (member.biography) {
    if (member.biography.includes('"membershipCategory":"ASSOCIATE"')) return true;
    if (member.biography.includes('"studyLevel":"MASTERS"') || member.biography.includes('"studyLevel":"PHD"')) return true;
    if (member.biography.includes('"membershipType":"ASSOCIATE"')) return true;
  }
  return false;
}

