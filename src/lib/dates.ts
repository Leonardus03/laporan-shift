const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

// Tanggal hari ini di zona WIB, format YYYY-MM-DD.
export function todayWibKey() {
  return new Date(Date.now() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}
