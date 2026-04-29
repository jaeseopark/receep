import type { StorybookConfig } from "@storybook/preact-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: {
    name: "@storybook/preact-vite",
    options: {},
  },
};

export default config;
