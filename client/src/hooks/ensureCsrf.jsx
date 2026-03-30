let csrfReady = false;

export async function ensureCsrf() {
  if (csrfReady) return;

  await fetch("https://encrypted-file-system-production.up.railway.app/user/csrf/", {
    credentials: "include",
  });

  csrfReady = true;
}
