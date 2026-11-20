export function isLocalTestDatabase(): boolean {
  if (process.env.RUN_LOCAL_DATABASE_TESTS !== "1") return false;
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.port !== "55439" || url.pathname !== "/biodentis_test_final") {
    throw new Error("Las pruebas de BD solo admiten biodentis_test_final en localhost:55439.");
  }
  return true;
}
