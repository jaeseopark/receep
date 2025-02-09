import { render } from "preact";
import { StrictMode } from "preact/compat";

import { Provider } from "@/components/ui/provider";

import App from "./app";

render(
  <StrictMode>
    <Provider>
      <App />
    </Provider>
  </StrictMode>,
  document.getElementById("app")!,
);
