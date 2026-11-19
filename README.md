# 🚀 RIPLeet — Company-Wise LeetCode Interview Tracker

Target technical interviews at top tech companies with real frequency data across **659 companies** and **3,399 LeetCode questions**.

---

## ✨ Features

- **📊 659 Companies & 3,399 Questions**: Normalized relational database containing company-specific LeetCode question frequencies across all timeframes.
- **⏱️ Timeframe Filtering**: Filter by 30 Days (🔥 Trending/Hot), 3 Months, 6 Months, 1 Year+, or All-Time.
- **🔐 User Authentication**: Secure NextAuth v5 session management (JWT-based credentials auth with bcrypt password hashing).
- **✅ 1-Click Progress Tracking**: Cycle status (`TODO` ⚪ ➡️ `ATTEMPTED` 🟡 ➡️ `SOLVED` 🟢) with instant auto-save to user profile.
- **📝 Personal Notes**: Save problem-solving hints, edge cases, and time/space complexity ($O(N)$ time, $O(1)$ space) directly on each problem.
- **🎯 Random "Pick One"**: Pick an unsolved question randomly to simulate an interview under time pressure.
- **📈 Analytics Breakdown**: Live progress bar and difficulty meter (Easy, Medium, Hard).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack, React 19, TypeScript)
- **Database & ORM**: [SQLite](https://www.sqlite.org/) with [Prisma ORM](https://www.prisma.io/)
- **Authentication**: [NextAuth.js v5](https://authjs.dev/) & [bcryptjs](https://www.npmjs.com/package/bcryptjs)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd RIPLeet
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set a secure `AUTH_SECRET` (generate with `openssl rand -hex 32`):

```env
DATABASE_URL="file:./leetcode_tracker.db"
AUTH_SECRET="your-generated-secret"
```

### 3. Initialize Database & Generate Prisma Client

```bash
npx prisma generate
```

*(Note: `prisma/leetcode_tracker.db` is already pre-populated with all 3,399 questions and 659 companies!)*

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Deployment Options

### Option A: Vercel (Recommended for Next.js)

1. Push this repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Under **Environment Variables**, add:
   - `DATABASE_URL`: `file:./leetcode_tracker.db`
   - `AUTH_SECRET`: Generate a random 32-character string
5. Click **Deploy**.

### Option B: Railway / Render (Full SQLite Persistence)

For persistent user registrations and progress updates across container restarts:

1. Push to GitHub.
2. Link repository to [Railway.app](https://railway.app) or [Render.com](https://render.com).
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Attach a persistent volume to `./prisma` if you want user progress saved indefinitely.

---

## 📄 License

MIT
