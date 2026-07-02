const BASE = '/api'; // Proxied by Vite to http://localhost:3000

export async function fetchStats() {
  const res = await fetch(`${BASE}/reviews/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchReviews(page = 1, limit = 10) {
  const res = await fetch(`${BASE}/reviews?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}

export async function fetchReview(id: string) {
  const res = await fetch(`${BASE}/reviews/${id}`);
  if (!res.ok) throw new Error('Failed to fetch review');
  return res.json();
}
