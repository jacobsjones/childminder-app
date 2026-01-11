// Server-side storage using filesystem
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');
const CHILDREN_FILE = join(DATA_DIR, 'children.json');
const ATTENDANCE_FILE = join(DATA_DIR, 'attendance.json');
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');
const INVOICES_FILE = join(DATA_DIR, 'invoices.json');

// Ensure data directory exists
const ensureDataDir = () => {
    try {
        if (!existsSync(DATA_DIR)) {
            mkdirSync(DATA_DIR, { recursive: true });
        }
    } catch (error) {
        console.error('[serverStore] Failed to ensure data directory:', error.message);
        // On Vercel, this might fail. We continue, but writes will fail later.
    }
};

// Helper to generate unique IDs
export const generateId = () => Math.random().toString(36).substr(2, 9);

// === Children ===
export const getChildren = () => {
    try {
        if (!existsSync(CHILDREN_FILE)) {
            return [];
        }
        const data = readFileSync(CHILDREN_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('[serverStore.getChildren] Error:', error);
        return [];
    }
};

export const saveChild = (child) => {
    ensureDataDir();
    console.log('[serverStore.saveChild] ===== START =====');
    console.log('[serverStore.saveChild] Input:', child);

    try {
        const children = getChildren();
        console.log('[serverStore.saveChild] Current count:', children.length);

        if (child.id) {
            const index = children.findIndex((c) => c.id === child.id);
            if (index > -1) {
                children[index] = child;
                console.log('[serverStore.saveChild] Updated existing child');
            } else {
                children.push({ ...child, id: generateId(), active: true });
                console.log('[serverStore.saveChild] Added as new (id not found)');
            }
        } else {
            const newChild = { ...child, id: generateId(), active: true };
            children.push(newChild);
            console.log('[serverStore.saveChild] Added new child with id:', newChild.id);
        }

        writeFileSync(CHILDREN_FILE, JSON.stringify(children, null, 2));
        console.log('[serverStore.saveChild] Saved successfully. New count:', children.length);
        console.log('[serverStore.saveChild] ===== END SUCCESS =====');
        return { success: true };
    } catch (error) {
        console.error('[serverStore.saveChild] ===== ERROR =====');
        console.error('[serverStore.saveChild] Error:', error);
        console.error('[serverStore.saveChild] ===== END ERROR =====');
        throw error;
    }
};

export const getChild = (id) => {
    const children = getChildren();
    return children.find(c => c.id === id);
};

// === Attendance ===
export const getAttendance = () => {
    try {
        if (!existsSync(ATTENDANCE_FILE)) {
            return [];
        }
        const data = readFileSync(ATTENDANCE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('[serverStore.getAttendance] Error:', error);
        return [];
    }
};

export const saveAttendance = (attendance) => {
    ensureDataDir();
    try {
        writeFileSync(ATTENDANCE_FILE, JSON.stringify(attendance, null, 2));
        return { success: true };
    } catch (error) {
        console.error('[serverStore.saveAttendance] Error:', error);
        throw error;
    }
};

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
    console.log('[serverStore.logHours] ===== START =====');
    console.log('[serverStore.logHours] Input:', { childId, hours, date });

    const all = getAttendance();
    const dateStr = date || new Date().toISOString().slice(0, 10);

    const existingIndex = all.findIndex(a =>
        a.childId === childId &&
        a.date === dateStr
    );

    if (existingIndex > -1) {
        all[existingIndex].hours = hours;
        console.log('[serverStore.logHours] Updated existing record');
    } else {
        const record = {
            id: generateId(),
            childId,
            date: dateStr,
            hours: hours,
            isAuto: false
        };
        all.push(record);
        console.log('[serverStore.logHours] Created new record');
    }

    saveAttendance(all);
    console.log('[serverStore.logHours] ===== END SUCCESS =====');
    return { success: true };
};

export const deleteAttendance = (recordId) => {
    const all = getAttendance();
    const updated = all.filter(a => a.id !== recordId);
    saveAttendance(updated);
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

export const getSettings = () => {
    try {
        if (!existsSync(SETTINGS_FILE)) {
            return getDefaultSettings();
        }
        const data = readFileSync(SETTINGS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('[serverStore.getSettings] Error:', error);
        return getDefaultSettings();
    }
};

export const saveSettings = (settings) => {
    ensureDataDir();
    console.log('[serverStore.saveSettings] ===== START =====');
    console.log('[serverStore.saveSettings] Input:', settings);

    try {
        writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        console.log('[serverStore.saveSettings] Saved successfully');
        console.log('[serverStore.saveSettings] ===== END SUCCESS =====');
        return { success: true };
    } catch (error) {
        console.error('[serverStore.saveSettings] ===== ERROR =====');
        console.error('[serverStore.saveSettings] Error:', error);
        console.error('[serverStore.saveSettings] ===== END ERROR =====');
        throw error;
    }
};

// === Invoices ===
export const getInvoices = () => {
    try {
        if (!existsSync(INVOICES_FILE)) {
            return [];
        }
        const data = readFileSync(INVOICES_FILE, 'utf-8');
        const invoices = JSON.parse(data);
        // Sort by newest first
        return invoices.sort((a, b) => new Date(b.dateSent) - new Date(a.dateSent));
    } catch (error) {
        console.error('[serverStore.getInvoices] Error:', error);
        return [];
    }
};

export const logInvoice = (invoice) => {
    ensureDataDir();
    console.log('[serverStore.logInvoice] ===== START =====');
    console.log('[serverStore.logInvoice] Input:', invoice);

    try {
        const all = getInvoices();
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

        writeFileSync(INVOICES_FILE, JSON.stringify(all, null, 2));
        console.log('[serverStore.logInvoice] Saved invoice successfully');
        console.log('[serverStore.logInvoice] ===== END SUCCESS =====');
        return record;
    } catch (error) {
        console.error('[serverStore.logInvoice] ===== ERROR =====');
        console.error('[serverStore.logInvoice] Error:', error);
        console.error('[serverStore.logInvoice] ===== END ERROR =====');
        throw error;
    }
};
