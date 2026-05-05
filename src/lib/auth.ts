export async function registerUser(
  email: string,
  password: string,
  profile: { name: string; course: string; institution: string; semester: string }
) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, ...profile }),
  });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error);
  }
  return res.json();
}

export async function loginUser(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error("Credenciais inválidas.");
  }
  return res.json();
}

export async function signOut() {
  await fetch("/api/auth/logout", { method: "POST" });
}
