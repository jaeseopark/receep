import { render } from "preact";

import { axios } from "./api.ts";
import App from "./app.tsx";
import { sigUserInfo } from "./store.ts";

import "./index.css";

axios
  .get("/api/me")
  .then((r) => r.data)
  .then((userInfo) => {
    sigUserInfo.value = userInfo;
  })
  .catch((e) => {
    console.error(e);
    // TODO: handle error
  });

render(<App />, document.getElementById("app")!);
