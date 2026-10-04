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

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (!isFormData && options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = payload?.error ?? res.statusText ?? "Request failed";
    throw new ApiError(res.status, message, payload?.details);
  }

  // Some responses return { success: true, data: ... }
  if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
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
