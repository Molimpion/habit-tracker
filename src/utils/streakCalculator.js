const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function toLocalISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayISO() {
  return toLocalISODate(new Date());
}

function isValidDateFormat(dateStr) {
  if (typeof dateStr !== 'string' || !ISO_DATE_REGEX.test(dateStr)) {
    return false;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toEpochDays(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function calculateStreaks(completedDates = [], referenceDate = getTodayISO()) {
  if (!Array.isArray(completedDates) || completedDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0, completedToday: false };
  }

  const uniqueValidDates = Array.from(
    new Set(completedDates.filter((d) => isValidDateFormat(d)))
  ).sort();

  if (uniqueValidDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0, completedToday: false };
  }

  const dayNumbers = uniqueValidDates.map(toEpochDays);
  const todayDayNum = toEpochDays(referenceDate);
  const completedToday = uniqueValidDates.includes(referenceDate);

  let bestStreak = 1;
  let tempStreak = 1;
  for (let i = 1; i < dayNumbers.length; i++) {
    if (dayNumbers[i] - dayNumbers[i - 1] === 1) {
      tempStreak += 1;
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
    } else {
      tempStreak = 1;
    }
  }

  const daySet = new Set(dayNumbers);
  let currentStreak = 0;
  let cursor = daySet.has(todayDayNum)
    ? todayDayNum
    : daySet.has(todayDayNum - 1)
    ? todayDayNum - 1
    : null;

  while (cursor !== null && daySet.has(cursor)) {
    currentStreak += 1;
    cursor -= 1;
  }

  return {
    currentStreak,
    bestStreak,
    completedToday,
  };
}

module.exports = {
  toLocalISODate,
  getTodayISO,
  isValidDateFormat,
  calculateStreaks,
};
