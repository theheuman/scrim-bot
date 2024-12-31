import { formatInTimeZone, getTimezoneOffset } from "date-fns-tz";

export const setEasternHours = (
  date: Date,
  hour: number,
  min?: number,
  sec?: number,
  milli?: number,
): Date => {
  const hourFormat = String(hour).padStart(2, "0");
  const dateString = formatInTimeZone(
    date,
    "America/New_York",
    `yyyy-MM-dd ${hourFormat}:mm:ssxxxxx`,
  ).replace(" ", "T");
  const zonedDate = new Date(dateString);
  zonedDate.setMinutes(min ?? date.getMinutes());
  zonedDate.setSeconds(sec ?? date.getSeconds());
  zonedDate.setMilliseconds(milli ?? date.getMilliseconds());
  return zonedDate;
};

export const parseDate = (monthDay: string, time: string) => {
  const { monthString, dayString } = getMonthDayString(monthDay);
  const timeString = getTimeString(time);
  const now = new Date();
  let calculatedYear = now.getFullYear();
  // if we're in december setting up a january scrim use correct year
  if (monthString === "01" && now.getMonth() >= 1) {
    calculatedYear++;
  }
  const dateStringNoOffset = `${calculatedYear}-${monthString}-${dayString}`;
  const utcOffset = getUtcOffset(new Date(dateStringNoOffset));
  const dateString = `${calculatedYear}-${monthString}-${dayString}T${timeString}${utcOffset}`;
  return new Date(dateString);
};

const getMonthDayString = (monthDay: string) => {
  const monthDaySplit = monthDay.split("/");
  const month = Number(monthDaySplit[0]);
  const day = Number(monthDaySplit[1]);
  if (isNaN(month) || month <= 0 || month > 12) {
    throw Error("Month not parseable");
  } else if (isNaN(day) || day <= 0 || day > 31) {
    throw Error("Day not parseable");
  }
  const monthString = String(month).padStart(2, "0");
  const dayString = String(day).padStart(2, "0");
  return { monthString, dayString };
};

// expected format hh:mm am
const getTimeString = (time: string) => {
  const timeArray = time.trim().split(" ");
  const hourMinuteString = timeArray[0];
  const ampmLabel = timeArray[1].toLowerCase();
  const hourMinuteArray = hourMinuteString.split(":");
  const hour = Number(hourMinuteArray[0]);
  let minute = Number(hourMinuteArray[1]);
  if (isNaN(hour) || hour <= 0 || hour > 12) {
    throw Error("Hour not valid");
  } else if (isNaN(minute)) {
    minute = 0;
  } else if (minute < 0 || minute > 59) {
    throw Error("Minute not valid");
  }

  let hourString;
  if (ampmLabel === "am") {
    if (hour == 12) {
      hourString = "00";
    } else {
      hourString = hour.toString().padStart(2, "0");
    }
    // check if 12, else keep same
  } else if (ampmLabel === "pm") {
    if (hour == 12) {
      hourString = "12";
    } else {
      hourString = (hour + 12).toString().padStart(2, "0");
    }
  } else {
    throw Error("am/pm label is invalid");
  }
  const minuteString = minute.toString().padStart(2, "0");
  return `${hourString}:${minuteString}:00`;
};

const getUtcOffset = (date: Date) => {
  const offsetHours =
    getTimezoneOffset("America/New_York", date) / 60 / 60 / 1000;
  return `-${String(Math.abs(offsetHours)).padStart(2, "0")}:00`;
};
