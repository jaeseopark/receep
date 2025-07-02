import { render } from "preact";

import App from "@/app";
import { fetchInitialData } from "@/gvars";

import "@/index.css";

fetchInitialData();

render(<App />, document.getElementById("app")!);
