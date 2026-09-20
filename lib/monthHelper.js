/**
 * Parse month name and optional year into start and end dates
 * @param {string} monthString - Month name (e.g., "January", "January 2026", or empty for current month)
 * @returns {Object} - { startDate, endDate, monthKey, monthName, year, month }
 */
export function parseMonthString(monthString) {
    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth(); // 0-indexed

    if (monthString) {
        const parts = monthString.trim().split(' ');
        const monthName = parts[0];
        const yearPart = parts[1];

        // Parse month name
        const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
        ];

        const monthIndex = monthNames.findIndex(
            m => m.startsWith(monthName.toLowerCase())
        );

        if (monthIndex !== -1) {
            targetMonth = monthIndex;
        }

        // Parse year if provided
        if (yearPart && !isNaN(yearPart)) {
            targetYear = parseInt(yearPart);
        }
    }

    // Create start and end dates for the month
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    // Format month name for display
    const monthNameDisplay = startDate.toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric'
    });

    return {
        startDate,
        endDate,
        monthKey: monthKeyFromDate(startDate),
        monthName: monthNameDisplay,
        year: targetYear,
        month: targetMonth
    };
}

/**
 * The month a record belongs to, as 'YYYY-MM'.
 *
 * Hours-based records store the date as a 'YYYY-MM-DD' string, so the month is
 * read straight off the text. Parsing it into a Date first would resolve to UTC
 * midnight and could land in the previous month on a server running behind UTC.
 *
 * @param {Object} record - Attendance record
 * @returns {string|null}
 */
export function monthKeyOf(record) {
    if (typeof record.date === 'string' && /^\d{4}-\d{2}/.test(record.date)) {
        return record.date.slice(0, 7);
    }

    const stamp = record.date || record.startTime;
    if (!stamp) return null;

    const date = new Date(stamp);
    if (Number.isNaN(date.getTime())) return null;

    return monthKeyFromDate(date);
}

/**
 * Filter attendance to a single month.
 * @param {Array} attendance - All attendance records
 * @param {string} monthKey - 'YYYY-MM'
 * @returns {Array}
 */
export function filterAttendanceByMonthKey(attendance, monthKey) {
    if (!monthKey) return [];
    return (attendance || []).filter(record => monthKeyOf(record) === monthKey);
}

/** 'YYYY-MM' for a Date, in local time. */
export function monthKeyFromDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** 'YYYY-MM' for the month happening now. */
export function currentMonthKey() {
    return monthKeyFromDate(new Date());
}

/** 'YYYY-MM' -> 'August 2026'. */
export function formatMonthKey(monthKey) {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
    });
}

/**
 * Every month that has attendance, newest first, with the current month always
 * included so a new month can be invoiced before any hours are logged in it.
 *
 * @param {Array} attendance - All attendance records
 * @returns {Array<string>} - 'YYYY-MM' keys
 */
export function availableMonthKeys(attendance) {
    const keys = new Set([currentMonthKey()]);
    (attendance || []).forEach(record => {
        const key = monthKeyOf(record);
        if (key) keys.add(key);
    });
    return [...keys].sort().reverse();
}

/**
 * Hours on a single record.
 *
 * Note the explicit null check: the attendance API returns null (not undefined)
 * when a record has no hours column, so testing only for undefined would treat
 * a timed session as zero hours.
 *
 * @param {Object} record - Attendance record
 * @returns {number}
 */
export function sessionHours(record) {
    if (record.hours !== undefined && record.hours !== null) {
        return Number(record.hours) || 0;
    }

    if (record.startTime && record.endTime) {
        const start = new Date(record.startTime);
        const end = new Date(record.endTime);
        const hours = (end - start) / (1000 * 60 * 60);
        return Number.isFinite(hours) ? Math.max(0, hours) : 0;
    }

    return 0;
}

/**
 * Calculate total hours from attendance records
 * @param {Array} records - Attendance records
 * @returns {number} - Total hours
 */
export function calculateTotalHours(records) {
    const total = (records || []).reduce((sum, record) => sum + sessionHours(record), 0);
    return Math.round(total * 100) / 100;
}
