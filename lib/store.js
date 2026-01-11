'use client';

const STORAGE_KEYS = {
  CHILDREN: 'childminder_children',
  ATTENDANCE: 'childminder_attendance',
  EXPENSES: 'childminder_expenses',
  INVOICES: 'childminder_invoices',
  SETTINGS: 'childminder_settings',
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
  // Support both old time-based and new hours-based records
  const childSessions = all.filter(a => a.childId === childId);
  return childSessions.reduce((sum, s) => {
    // New hours-based system
    if (s.hours !== undefined) {
      return sum + s.hours;
    }
    // Old time-based system (backward compatibility)
    if (s.endTime) {
      return sum + calculateSessionHours(s.startTime, s.endTime);
    }
    return sum;
  }, 0);
};

export const getChildren = () => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.CHILDREN);
  return data ? JSON.parse(data) : [];
};

export const saveChild = (child) => {
  console.log('[store.saveChild] ===== START =====');
  console.log('[store.saveChild] Input child:', child);
  console.log('[store.saveChild] Type of child:', typeof child);

  try {
    if (typeof window === 'undefined') {
      console.log('[store.saveChild] Running in server context - skipping localStorage, returning success');
      console.log('[store.saveChild] Client will sync data via router.refresh()');
      console.log('[store.saveChild] ===== END (SERVER CONTEXT) =====');
      return { success: true, serverSide: true };
    }

    const children = getChildren();
    console.log('[store.saveChild] Current children count:', children.length);

    if (child.id) {
      console.log('[store.saveChild] Updating existing child with id:', child.id);
      const index = children.findIndex((c) => c.id === child.id);
      if (index > -1) {
        children[index] = child;
        console.log('[store.saveChild] Updated child at index:', index);
      } else {
        console.warn('[store.saveChild] Child id not found, adding as new');
        const newId = generateId();
        children.push({ ...child, id: newId, active: true });
        console.log('[store.saveChild] Added with new id:', newId);
      }
    } else {
      console.log('[store.saveChild] Adding new child');
      const newId = generateId();
      const newChild = { ...child, id: newId, active: true };
      console.log('[store.saveChild] New child object:', newChild);
      children.push(newChild);
      console.log('[store.saveChild] Added child with id:', newId);
    }

    console.log('[store.saveChild] New children count:', children.length);
    console.log('[store.saveChild] Saving to localStorage...');

    const jsonString = JSON.stringify(children);
    console.log('[store.saveChild] JSON string length:', jsonString.length);

    localStorage.setItem(STORAGE_KEYS.CHILDREN, jsonString);
    console.log('[store.saveChild] Saved successfully');
    console.log('[store.saveChild] ===== END SUCCESS =====');
  } catch (error) {
    console.error('[store.saveChild] ===== ERROR =====');
    console.error('[store.saveChild] Error:', error);
    console.error('[store.saveChild] Error message:', error.message);
    console.error('[store.saveChild] Error stack:', error.stack);
    console.error('[store.saveChild] ===== END ERROR =====');
    throw error;
  }
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

// --- Hours-based system ---
export const getTodayHours = (childId) => {
  const all = getAttendance();
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecord = all.find(a =>
    a.childId === childId &&
    a.date === todayStr
  );
  return todayRecord ? todayRecord.hours : null;
};

export const logHours = (childId, hours, date = null) => {
  const all = getAttendance();
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
    const record = {
      id: generateId(),
      childId,
      date: dateStr,
      hours: hours,
      isAuto: false
    };
    all.push(record);
  }

  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(all));
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

// --- Invoices ---
export const getInvoices = () => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
  const invoices = data ? JSON.parse(data) : [];
  // Sort by newest first
  return invoices.sort((a, b) => new Date(b.dateSent) - new Date(a.dateSent));
};

export const logInvoice = (invoice) => {
  if (typeof window === 'undefined') return;
  const all = getInvoices();
  const record = {
    id: generateId(),
    childId: invoice.childId,
    childName: invoice.childName,
    parentEmail: invoice.parentEmail,
    amount: invoice.amount,
    period: invoice.period,
    dateSent: getNow(),
    status: 'Sent'
  };
  all.push(record);
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(all));
  return record;
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

        const newRecord = {
          id: generateId(),
          childId: child.id,
          date: dateStr,
          hours: scheduledHours,
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

// --- Settings ---
export const getSettings = () => {
  if (typeof window === 'undefined') return getDefaultSettings();
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return data ? JSON.parse(data) : getDefaultSettings();
};

const getDefaultSettings = () => ({
  businessName: '',
  businessEmail: '',
  bankName: '',
  accountName: '',
  sortCode: '',
  accountNumber: '',
  paymentTermsNote: '',
});

export const saveSettings = (settings) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};
