// utils/date.ts

export const formatCambodiaTime = (time: string): string => {
  return new Date(time).toLocaleString("en-GB", {
    timeZone: "Asia/Phnom_Penh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};