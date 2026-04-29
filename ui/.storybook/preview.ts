import type { Preview } from "@storybook/preact";

import "@/index.css";

const preview: Preview = {
  parameters: {
    viewport: {
      viewports: {
        mobile: {
          name: "Mobile",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
        desktop: {
          name: "Desktop",
          styles: { width: "1440px", height: "900px" },
          type: "desktop",
        },
      },
      defaultViewport: "desktop",
    },
  },
};

export default preview;
