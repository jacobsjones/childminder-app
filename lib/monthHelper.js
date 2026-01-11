/**
 * Parse month name and optional year into start and end dates
 * @param {string} monthString - Month name (e.g., "January", "January 2026", or empty for current month)
 * @returns {Object} - { startDate, endDate, monthName, year, month }
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
        monthName: monthNameDisplay,
        year: targetYear,
        month: targetMonth
    };
}

/**
 * Filter attendance records for a specific month
 * @param {Array} attendance - All attendance records
 * @param {Date} startDate - Start of month
 * @param {Date} endDate - End of month
 * @returns {Array} - Filtered attendance records
 */
export function filterAttendanceByMonth(attendance, startDate, endDate) {
    return attendance.filter(record => {
        let recordDate;

        if (record.date) {
            // Hours-based record
            recordDate = new Date(record.date);
        } else if (record.startTime) {
            // Time-based record
            recordDate = new Date(record.startTime);
        } else {
            return false;
        }

        return recordDate >= startDate && recordDate <= endDate;
    });
}

/**
 * Calculate total hours from attendance records
 * @param {Array} records - Attendance records
 * @returns {number} - Total hours
 */
export function calculateTotalHours(records) {
    return records.reduce((sum, record) => {
        if (record.hours !== undefined) {
            // Hours-based record
            return sum + record.hours;
        } else if (record.startTime && record.endTime) {
            // Time-based record
            const start = new Date(record.startTime);
            const end = new Date(record.endTime);
            const hours = (end - start) / (1000 * 60 * 60);
            return sum + Math.max(0, hours);
        }
        return sum;
    }, 0);
}
