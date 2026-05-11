// 20 motivational quotes — picked deterministically by day of year so every
// student sees the same line each day.
const QUOTES: { text: string; author: string }[] = [
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Anonymous" },
  { text: "Strive for progress, not perfection.", author: "Anonymous" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Motivation gets you going. Discipline keeps you growing.", author: "John C. Maxwell" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Don't limit your challenges. Challenge your limits.", author: "Jerry Dunn" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "What we learn with pleasure we never forget.", author: "Alfred Mercier" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "George Lorimer" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "Knowledge is power. Information is liberating.", author: "Kofi Annan" },
];

export function getDailyQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return QUOTES[day % QUOTES.length];
}
