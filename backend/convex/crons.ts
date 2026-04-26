import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "check-alert-thresholds",
  { hourUTC: 14, minuteUTC: 0 },
  internal.alerts.checkThresholds
);

export default crons;
