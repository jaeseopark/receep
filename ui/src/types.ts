export type UserInfo = {
  username: string;
  roles: string[];
};

export type AppInfo = {
  signup: "OPEN" | "CLOSED" | "INVITE_ONLY";
  totp_enabled: boolean;
  user_count: number;
};
