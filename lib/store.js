'use client';

const STORAGE_KEYS = {
  CHILDREN: 'childminder_children',
  ATTENDANCE: 'childminder_attendance',
  EXPENSES: 'childminder_expenses',
  INVOICES: 'childminder_invoices',
};

// --- Helpers ---
export const generateId = () => Math.random().toString(36).substr(2, 9);
export const getNow = () => new Date().toISOString();

export const calculateSessionHours = (start, end) => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(0, (e - s) / (1000 * 60 * 60));
};

export const getTotalHoursForChild = (childId) => {
  const all = getAttendance();
  const childSessions = all.filter(a => a.childId === childId && a.endTime);
  return childSessions.reduce((sum, s) => sum + calculateSessionHours(s.startTime, s.endTime), 0);
};

export const getChildren = () => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.CHILDREN);
  return data ? JSON.parse(data) : [];
};

export const saveChild = (child) => {
  const children = getChildren();
  if (child.id) {
    const index = children.findIndex((c) => c.id === child.id);
    if (index > -1) children[index] = child;
  } else {
    children.push({ ...child, id: generateId(), active: true });
  }
  localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(children));
};

// --- Helpers ---
export const getChild = (id) => {
  const children = getChildren();
  return children.find(c => c.id === id);
};

// --- Attendance ---
export const getAttendance = () => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
  return data ? JSON.parse(data) : [];
};

export const updateAttendance = (updatedRecord) => {
  const all = getAttendance();
  const index = all.findIndex(a => a.id === updatedRecord.id);
  if (index > -1) {
    all[index] = updatedRecord;
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(all));
  }
};

export const deleteAttendance = (recordId) => {
  const all = getAttendance();
  const updated = all.filter(a => a.id !== recordId);
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(updated));
};

export const getActiveCheckIn = (childId) => {
  const all = getAttendance();
  return all.find((a) => a.childId === childId && !a.endTime);
};

export const checkIn = (childId) => {
  const all = getAttendance();
  // Ensure not already checked in
  if (all.some((a) => a.childId === childId && !a.endTime)) return;

  const record = {
    id: generateId(),
    childId,
    startTime: getNow(),
    endTime: null,
  };
  all.push(record);
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(all));
};

export const checkOut = (childId) => {
  const all = getAttendance();
  const index = all.findIndex((a) => a.childId === childId && !a.endTime);
  if (index > -1) {
    all[index].endTime = getNow();
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(all));
  }
};

// --- Expenses ---
export const getExpenses = () => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
  return data ? JSON.parse(data) : [];
};

export const addExpense = (expense) => {
  const all = getExpenses();
  all.push({ ...expense, id: generateId(), date: getNow() });
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(all));
};

// --- Processing ---
export const processScheduledAttendance = () => {
  if (typeof window === 'undefined') return;

  const today = new Date();
  const dayIndex = today.getDay(); // 0 = Sun, 1 = Mon, etc.
  const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

  const children = getChildren();
  const currentAttendance = getAttendance();
  let updated = false;

  children.forEach(child => {
    // Check if child has schedule enabled for today
    if (child.schedule && child.schedule.enabled && child.schedule.days.includes(dayIndex)) {
      // Check if already has ANY record for today (manual or auto)
      const hasRecord = currentAttendance.some(a =>
        a.childId === child.id &&
        a.startTime.startsWith(dateStr)
      );

      if (!hasRecord) {
        // Auto-create record
        const start = new Date(`${dateStr}T${child.schedule.start}`);
        const end = new Date(`${dateStr}T${child.schedule.end}`);

        const newRecord = {
          id: generateId(),
          childId: child.id,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          isAuto: true
        };
        currentAttendance.push(newRecord);
        updated = true;
      }
    }
  });

  if (updated) {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(currentAttendance));
  }
};
