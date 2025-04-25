export function hash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0; // Keep it unsigned
  }
  return hash;
}

export const isPositiveInteger = (str?: string): boolean => {
  if (!str) {
    return false;
  }

  const int = Number.parseInt(str);
  if (Number.isNaN(int)) {
    return false;
  }

  // TODO: need a more robust logic because this will return true if str="1.5" for example.
  return int >= 0;
};

export function toHumanFilesize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

export const evaluateAmountInput = (input: string, decimals: number): number => {
  // TODO: if the string strats with a dot. prefix with a leading 0
  // TODO: if there's no number in front of a dot, add a 0.

  const sanitizedInput = input.replace(/\s|[$€£¥]/g, "");

  if (!/^[0-9+\-*/().]+$/.test(sanitizedInput)) {
    throw new Error("Invalid input: contains unsupported characters.");
  }

  const result = Function(`"use strict"; return (${sanitizedInput})`)();

  // Round the result to 2 decimal places
  return result.toFixed(decimals);
};
