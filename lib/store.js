'use server';

import { kv } from '@vercel/kv';

if (!process.env.KV_REST_API_URL) {
  console.error("CRITICAL: KV_REST_API_URL is missing! Data will not save to Vercel KV.");
}

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
  console.log("1. [Action] Starting saveChild...", child);
  try {
    const children = await getChildren();
    console.log("2. [Action] Fetched current children, count:", children.length);
    
    if (child.id) {
      const index = children.findIndex((c) => c.id === child.id);
      if (index > -1) {
        children[index] = child;
        console.log("2b. Updating existing child");
      } else {
        const newId = await generateId();
        children.push({ ...child, id: newId, active: true });
        console.log("2b. Adding as new (id not found)");
      }
    } else {
      const newId = await generateId();
      const newChild = { ...child, id: newId, active: true };
      children.push(newChild);
      console.log("2b. Adding as new child");
    }

    console.log("3. [Action] Attempting to write children to KV...");
    await kv.set(KV_KEYS.CHILDREN, children);
    console.log("4. [Action] Write successful!");

    // Verify
    const verify = await kv.get(KV_KEYS.CHILDREN);
    console.log("5. [Action] Verification read, count:", verify?.length);

    return { success: true };
  } catch (error) {
    console.error("CRITICAL SAVE CHILD ERROR:", error);
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
  console.log("1. [Action] Starting logHours...", { childId, hours, date });
  try {
    const all = await getAttendance();
    const dateStr = date || new Date().toISOString().slice(0, 10);
    console.log("2. [Action] Fetched current attendance, count:", all.length);

    // Check if record already exists for this date
    const existingIndex = all.findIndex(a =>
      a.childId === childId &&
      a.date === dateStr
    );

    if (existingIndex > -1) {
      // Update existing record
      all[existingIndex].hours = hours;
      console.log("2b. Updating existing record");
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
      console.log("2b. Creating new record");
    }

    console.log("3. [Action] Attempting to write attendance to KV...");
    await kv.set(KV_KEYS.ATTENDANCE, all);
    console.log("4. [Action] Write successful!");

    // Verify
    const verify = await kv.get(KV_KEYS.ATTENDANCE);
    console.log("5. [Action] Verification read, count:", verify?.length);
  } catch (error) {
    console.error("CRITICAL LOG HOURS ERROR:", error);
    throw error;
  }
};