export async function getMenu() {
  const response = await fetch("http://localhost:8080/menu");

  if (!response.ok) {
    throw new Error("Failed to fetch menu");
  }

  return await response.json();
}

