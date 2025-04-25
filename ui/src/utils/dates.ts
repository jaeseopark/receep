import { formatDistanceToNow } from "date-fns";

export const toRelativeTime = (epoch: number): string => {
  // the epoch times in the backend are in seconds, so applying 1000 to make it ms.
  // addSuffix adds "ago"
  // strings are prefixed with "about" so replacing that as well.
  return formatDistanceToNow(new Date(epoch * 1000), { addSuffix: true })
    .replace("about ", "")
    .replace("less than a minute ago", "Just now")
    .replace("in less than a minute", "Just now");
};

export const getYearTimestamps = (y: number) => ({
  start: new Date(y, 0, 1).getTime(),
  end: new Date(y, 11, 31, 23, 59, 59, 999).getTime(),
});
