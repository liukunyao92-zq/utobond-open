function savedAtMillis(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return 0;
  const value = Date.parse(snapshot.savedAt || "");
  return Number.isFinite(value) ? value : 0;
}

/**
 * 浏览器即时缓存和服务端快照都存在时，优先使用明确更新较晚的一份。
 * 旧版服务端快照没有 savedAt；只要本地缓存带时间戳，就说明它由新版
 * 页面在用户输入后写入，应避免再被旧快照覆盖。
 */
export function latestSnapshot(cached, remote) {
  const local = cached && typeof cached === "object" ? cached : null;
  const server = remote && typeof remote === "object" ? remote : null;
  if (!local) return server;
  if (!server) return local;

  const localTime = savedAtMillis(local);
  const serverTime = savedAtMillis(server);
  if (localTime && !serverTime) return local;
  if (!localTime && serverTime) return server;
  return localTime > serverTime ? local : server;
}
