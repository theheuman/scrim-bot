import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { isGuildMember } from "../utility/utility";
import { authService } from "../services";

export abstract class Command extends SlashCommandBuilder {
  isAdmin: boolean;

  protected constructor(
    name: string,
    description: string,
    isAdmin: boolean = false,
  ) {
    super();
    this.setName(name);
    this.setDescription(description);
    this.isAdmin = isAdmin ?? false;
  }

  addUserInput(name: string, description: string, isRequired: boolean = false) {
    this.addUserOption((option) =>
      option.setName(name).setDescription(description).setRequired(isRequired),
    );
  }

  addStringInput(
    name: string,
    description: string,
    isRequired: boolean = false,
  ) {
    this.addStringOption((option) =>
      option.setName(name).setDescription(description).setRequired(isRequired),
    );
  }

  addNumberInput(
    name: string,
    description: string,
    isRequired: boolean = false,
  ) {
    this.addNumberOption((option) =>
      option.setName(name).setDescription(description).setRequired(isRequired),
    );
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (this.isAdmin) {
      if (!isGuildMember(interaction.member)) {
        await interaction.reply(
          "Can't find the member issuing the command or this is an api command, no command executed",
        );
        return;
      } else if (!(await authService.memberIsAdmin(interaction.member))) {
        await interaction.reply("User calling command is not authorized");
        return;
      }
    }
    return this.run(interaction);
  }

  abstract run(interaction: ChatInputCommandInteraction): Promise<void>;
}

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

// TODO once date-fns is merge in uncomment the conversion
const getUtcOffset = (date: Date) => {
  console.debug(date);
  const offsetHours = 5; // getTimezoneOffset("America/New_York", date) / 60 / 60 / 1000;
  return `-${String(Math.abs(offsetHours)).padStart(2, "0")}:00`;
};
