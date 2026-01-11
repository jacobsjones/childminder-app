'use server';

import { kv } from '@vercel/kv';

const KV_KEYS = {
  CHILDREN: 'user:default:children',
  ATTENDANCE: 'user:default:attendance',
  EXPENSES: 'user:default:expenses',
  INVOICES: 'user:default:invoices',
  SETTINGS: 'user:default:settings',
};

// --- Helpers ---
export const generateId = async () => Math.random().toString(36).substr(2, 9);
export const getNow = async () => new Date().toISOString();

export const calculateSessionHours = async (start, end) => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(0, (e - s) / (1000 * 60 * 60));
};

export const getTotalHoursForChild = async (childId) => {
  const all = await getAttendance();
  // Support both old time-based and new hours-based records
  const childSessions = all.filter(a => a.childId === childId);
  
  let total = 0;
  for (const s of childSessions) {
    // New hours-based system
    if (s.hours !== undefined) {
      total += s.hours;
    }
    // Old time-based system (backward compatibility)
    else if (s.endTime) {
      total += await calculateSessionHours(s.startTime, s.endTime);
    }
  }
  return total;
};

// --- Children ---
export const getChildren = async () => {
  try {
    const data = await kv.get(KV_KEYS.CHILDREN);
    return data || [];
  } catch (error) {
    console.error('[store.getChildren] Error:', error);
    return [];
  }
};

export const saveChild = async (child) => {
  try {
    const children = await getChildren();
    
    if (child.id) {
      const index = children.findIndex((c) => c.id === child.id);
      if (index > -1) {
        children[index] = child;
      } else {
        const newId = await generateId();
        children.push({ ...child, id: newId, active: true });
      }
    } else {
      const newId = await generateId();
      const newChild = { ...child, id: newId, active: true };
      children.push(newChild);
    }

    await kv.set(KV_KEYS.CHILDREN, children);
    return { success: true };
  } catch (error) {
    console.error('[store.saveChild] Error:', error);
    throw error;
  }
};

export const getChild = async (id) => {
  const children = await getChildren();
  return children.find(c => c.id === id);
};

// --- Attendance ---
export const getAttendance = async () => {
  try {
    const data = await kv.get(KV_KEYS.ATTENDANCE);
    return data || [];
  } catch (error) {
    console.error('[store.getAttendance] Error:', error);
    return [];
  }
};

export const updateAttendance = async (updatedRecord) => {
  const all = await getAttendance();
  const index = all.findIndex(a => a.id === updatedRecord.id);
  if (index > -1) {
    all[index] = updatedRecord;
    await kv.set(KV_KEYS.ATTENDANCE, all);
  }
};

export const deleteAttendance = async (recordId) => {
  const all = await getAttendance();
  const updated = all.filter(a => a.id !== recordId);
  await kv.set(KV_KEYS.ATTENDANCE, updated);
};

export const getActiveCheckIn = async (childId) => {
  const all = await getAttendance();
  return all.find((a) => a.childId === childId && !a.endTime);
};

export const checkIn = async (childId) => {
  const all = await getAttendance();
  // Ensure not already checked in
  if (all.some((a) => a.childId === childId && !a.endTime)) return;

  const newId = await generateId();
  const now = await getNow();
  const record = {
    id: newId,
    childId,
    startTime: now,
    endTime: null,
  };
  all.push(record);
  await kv.set(KV_KEYS.ATTENDANCE, all);
};

export const checkOut = async (childId) => {
  const all = await getAttendance();
  const index = all.findIndex((a) => a.childId === childId && !a.endTime);
  if (index > -1) {
    all[index].endTime = await getNow();
    await kv.set(KV_KEYS.ATTENDANCE, all);
  }
};

// --- Hours-based system ---
export const getTodayHours = async (childId) => {
  const all = await getAttendance();
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecord = all.find(a =>
    a.childId === childId &&
    a.date === todayStr
  );
  return todayRecord ? todayRecord.hours : null;
};

export const logHours = async (childId, hours, date = null) => {
  const all = await getAttendance();
  const dateStr = date || new Date().toISOString().slice(0, 10);

  // Check if record already exists for this date
  const existingIndex = all.findIndex(a =>
    a.childId === childId &&
    a.date === dateStr
  );

  if (existingIndex > -1) {
    // Update existing record
    all[existingIndex].hours = hours;
  } else {
    // Create new record
    const newId = await generateId();
    const record = {
      id: newId,
      childId,
      date: dateStr,
      hours: hours,
      isAuto: false
    };
    all.push(record);
  }

  await kv.set(KV_KEYS.ATTENDANCE, all);
};

// --- Expenses ---
export const getExpenses = async () => {
  try {
    const data = await kv.get(KV_KEYS.EXPENSES);
    return data || [];
  } catch (error) {
    console.error('[store.getExpenses] Error:', error);
    return [];
  }
};

export const addExpense = async (expense) => {
  const all = await getExpenses();
  const newId = await generateId();
  const now = await getNow();
  all.push({ ...expense, id: newId, date: now });
  await kv.set(KV_KEYS.EXPENSES, all);
};

// --- Invoices ---
export const getInvoices = async () => {
  try {
    const data = await kv.get(KV_KEYS.INVOICES);
    const invoices = data || [];
    // Sort by newest first
    return invoices.sort((a, b) => new Date(b.dateSent) - new Date(a.dateSent));
  } catch (error) {
    console.error('[store.getInvoices] Error:', error);
    return [];
  }
};

export const logInvoice = async (invoice) => {
  const all = await getInvoices();
  const newId = await generateId();
  const now = await getNow();
  const record = {
    id: newId,
    childId: invoice.childId,
    childName: invoice.childName,
    parentEmail: invoice.parentEmail,
    amount: invoice.amount,
    period: invoice.period,
    dateSent: now,
    status: 'Sent'
  };
  all.push(record);
  await kv.set(KV_KEYS.INVOICES, all);
  return record;
};

// --- Processing ---
export const processScheduledAttendance = async () => {
  const today = new Date();
  const dayIndex = today.getDay(); // 0 = Sun, 1 = Mon, etc.
  const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

  const children = await getChildren();
  const currentAttendance = await getAttendance();
  let updated = false;

  for (const child of children) {
    // Check if child has schedule enabled for today
    if (child.schedule && child.schedule.enabled && child.schedule.days.includes(dayIndex)) {
      // Check if already has ANY record for today (manual or auto)
      const hasRecord = currentAttendance.some(a =>
        a.childId === child.id &&
        a.date === dateStr
      );

      if (!hasRecord) {
        // Auto-create hours-based record
        const start = child.schedule.start || '09:00';
        const end = child.schedule.end || '17:00';

        // Calculate default hours from schedule
        const [startHour, startMin] = start.split(':').map(Number);
        const [endHour, endMin] = end.split(':').map(Number);
        const scheduledHours = (endHour + endMin / 60) - (startHour + startMin / 60);

        const newId = await generateId();
        const newRecord = {
          id: newId,
          childId: child.id,
          date: dateStr,
          hours: scheduledHours,
          isAuto: true
        };
        currentAttendance.push(newRecord);
        updated = true;
      }
    }
  }

  if (updated) {
    await kv.set(KV_KEYS.ATTENDANCE, currentAttendance);
  }
};

// --- Settings ---
const getDefaultSettings = () => ({
  businessName: '',
  businessEmail: '',
  bankName: '',
  accountName: '',
  sortCode: '',
  accountNumber: '',
  paymentTermsNote: '',
});

export const getSettings = async () => {
  try {
    const data = await kv.get(KV_KEYS.SETTINGS);
    return data || getDefaultSettings();
  } catch (error) {
    console.error('[store.getSettings] Error:', error);
    return getDefaultSettings();
  }
};

export const saveSettings = async (settings) => {
  await kv.set(KV_KEYS.SETTINGS, settings);
};