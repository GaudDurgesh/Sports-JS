import axios from "axios";

const client = axios.create({
  baseURL: "https://api.football-data.org/v4",
  timeout: 10_000,
});

const GAP_MS = 8_000;
const MAX_PENDING = 20;


let queue = Promise.resolve();
let nextAllowedAt = 0;
let pending = 0;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getCooldown(headers) {
  const value = headers?.["retry-after"];
  const seconds = Number(value);

  if (value && Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(60_000, seconds * 1000);
  }

  const date = Date.parse(value ?? "");
  return Number.isFinite(date) ? Math.max(60_000, date - Date.now()) : 60_000;
}

export function footballGet(path, params = {}) {
  if (!process.env.FOOTBALL_DATA_KEY) {
    return Promise.reject(new Error("FOOTBALL_DATA_KEY is missing"));
  }

  if (pending >= MAX_PENDING) {
    const error = new Error("Football request queue is full");
    error.code = "FOOTBALL_QUEUE_FULL";
    return Promise.reject(error);
  }

  pending += 1;

  const task = queue.then(async () => {
    try {
      const delay = Math.max(0, nextAllowedAt - Date.now());

      if (delay > 0) await wait(delay);

      nextAllowedAt = Date.now() + GAP_MS;

      return await client.get(path, {
        params,
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_DATA_KEY,
        },
      });
    } catch (error) {
      if (error.response?.status === 429) {
        nextAllowedAt = Math.max(
          nextAllowedAt,
          Date.now() + getCooldown(error.response.headers),
        );
      }

      throw error;
    } finally {
      pending -= 1;
    }
  });

  // A failed request must not stop subsequent queued requests.
  queue = task.catch(() => {});

  return task;
}
