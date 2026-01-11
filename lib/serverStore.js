import { kv } from '@vercel/kv';

const KV_KEYS = {
  CHILDREN: 'user:default:children',
  ATTENDANCE: 'user:default:attendance',
  EXPENSES: 'user:default:expenses',
  INVOICES: 'user:default:invoices',
  SETTINGS: 'user:default:settings',
};

// Helper to generate unique IDs
export const generateId = () => Math.random().toString(36).substr(2, 9);

// === Children ===
export const getChildren = async () => {
    try {
        const data = await kv.get(KV_KEYS.CHILDREN);
        return data || [];
    } catch (error) {
        console.error('[serverStore.getChildren] Error:', error);
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
                children.push({ ...child, id: generateId(), active: true });
            }
        } else {
            const newChild = { ...child, id: generateId(), active: true };
            children.push(newChild);
        }

        await kv.set(KV_KEYS.CHILDREN, children);
        return { success: true };
    } catch (error) {
        console.error('[serverStore.saveChild] Error:', error);
        throw error;
    }
};

export const getChild = async (id) => {
    const children = await getChildren();
    return children.find(c => c.id === id);
};

// === Attendance ===
export const getAttendance = async () => {
    try {
        const data = await kv.get(KV_KEYS.ATTENDANCE);
        return data || [];
    } catch (error) {
        console.error('[serverStore.getAttendance] Error:', error);
        return [];
    }
};

export const saveAttendance = async (attendance) => {
    try {
        await kv.set(KV_KEYS.ATTENDANCE, attendance);
        return { success: true };
    } catch (error) {
        console.error('[serverStore.saveAttendance] Error:', error);
        throw error;
    }
};

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

    const existingIndex = all.findIndex(a =>
        a.childId === childId &&
        a.date === dateStr
    );

    if (existingIndex > -1) {
        all[existingIndex].hours = hours;
    } else {
        const record = {
            id: generateId(),
            childId,
            date: dateStr,
            hours: hours,
            isAuto: false
        };
        all.push(record);
    }

    await saveAttendance(all);
    return { success: true };
};

export const deleteAttendance = async (recordId) => {
    const all = await getAttendance();
    const updated = all.filter(a => a.id !== recordId);
    await saveAttendance(updated);
    return { success: true };
};

// === Settings ===
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
        console.error('[serverStore.getSettings] Error:', error);
        return getDefaultSettings();
    }
};

export const saveSettings = async (settings) => {
    try {
        await kv.set(KV_KEYS.SETTINGS, settings);
        return { success: true };
    } catch (error) {
        console.error('[serverStore.saveSettings] Error:', error);
        throw error;
    }
};

// === Invoices ===
export const getInvoices = async () => {
    try {
        const data = await kv.get(KV_KEYS.INVOICES);
        const invoices = data || [];
        // Sort by newest first
        return invoices.sort((a, b) => new Date(b.dateSent) - new Date(a.dateSent));
    } catch (error) {
        console.error('[serverStore.getInvoices] Error:', error);
        return [];
    }
};

export const logInvoice = async (invoice) => {
    try {
        const all = await getInvoices();
        const record = {
            id: generateId(),
            childId: invoice.childId,
            childName: invoice.childName,
            parentEmail: invoice.parentEmail,
            amount: invoice.amount,
            period: invoice.period,
            dateSent: new Date().toISOString(),
            status: 'Sent'
        };
        all.push(record);

        await kv.set(KV_KEYS.INVOICES, all);
        return record;
    } catch (error) {
        console.error('[serverStore.logInvoice] Error:', error);
        throw error;
    }
};