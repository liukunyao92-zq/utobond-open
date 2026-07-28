import React from "react";
import ReactDOM from "react-dom/client";
import { UtobangApp, LOCAL_EDITION, apiFetch } from "@utobond/ui";

/**
 * 乌托帮 Web 入口。
 * 没有登录、没有订阅、没有平台后台 —— 打开就能用,AI 走你自己配的模型。
 */
const persistence = {
  load: () => apiFetch("/data/snapshot").then((data) => data.snapshot),
  save: (snapshot) => apiFetch("/data/snapshot", {
    method: "PUT", body: JSON.stringify({ snapshot }),
  }),
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <UtobangApp edition={LOCAL_EDITION} persistence={persistence} />
  </React.StrictMode>
);
