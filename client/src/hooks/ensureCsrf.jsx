let csrfReady = false;

export async function ensureCsrf() {
  if (csrfReady) return;

  await fetch("http://localhost:8000/user/csrf/", {
    credentials: "include",
  });

  csrfReady = true;
}
