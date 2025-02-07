import { Provider } from "@/components/ui/provider";
import { render } from "preact";
import { StrictMode } from "preact/compat";

import App from "./app";

render(
  <StrictMode>
    <Provider>
      <App />
    </Provider>
  </StrictMode>,
  document.getElementById("app")!,
);
