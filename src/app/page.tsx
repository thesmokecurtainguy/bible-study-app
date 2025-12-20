import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-stone-50">
      {/* Header */}
      <header className="px-6 py-4">
        <nav className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="h-8 w-8 text-amber-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
            <span className="text-xl font-semibold text-stone-800">Bible Study App</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-800"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="px-6">
        <div className="mx-auto max-w-4xl py-20 text-center sm:py-32">
          {/* Cross Icon */}
          <div className="mb-8 flex justify-center">
            <div className="rounded-full bg-amber-100 p-4">
              <svg
                className="h-12 w-12 text-amber-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl md:text-6xl">
            Bible Study App
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-stone-600 sm:text-xl">
            Transform your Bible study journey with interactive studies, prayer tracking, 
            and community discussion. Grow deeper in faith, together.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="w-full rounded-xl bg-amber-700 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-amber-800 hover:shadow-xl sm:w-auto"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl border-2 border-stone-300 bg-white px-8 py-4 text-lg font-semibold text-stone-700 transition-all hover:border-stone-400 hover:bg-stone-50 sm:w-auto"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mx-auto max-w-5xl pb-20">
          <h2 className="mb-12 text-center text-2xl font-semibold text-stone-800 sm:text-3xl">
            Everything you need for meaningful Bible study
          </h2>
          
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100">
              <div className="mb-4 inline-flex rounded-xl bg-amber-100 p-3">
                <svg
                  className="h-6 w-6 text-amber-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  />
                </svg>
              </div>
              <h3 className="mb-2 font-semibold text-stone-800">Interactive Studies</h3>
              <p className="text-sm leading-relaxed text-stone-600">
                Structured weekly studies with daily readings, reflection questions, and personal journaling.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100">
              <div className="mb-4 inline-flex rounded-xl bg-rose-100 p-3">
                <svg
                  className="h-6 w-6 text-rose-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 font-semibold text-stone-800">Prayer Tracking</h3>
              <p className="text-sm leading-relaxed text-stone-600">
                Keep track of prayer requests and celebrate answered prayers with your community.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100">
              <div className="mb-4 inline-flex rounded-xl bg-sky-100 p-3">
                <svg
                  className="h-6 w-6 text-sky-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 font-semibold text-stone-800">Community Groups</h3>
              <p className="text-sm leading-relaxed text-stone-600">
                Join or create study groups for accountability and rich discussion with fellow believers.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100">
              <div className="mb-4 inline-flex rounded-xl bg-emerald-100 p-3">
                <svg
                  className="h-6 w-6 text-emerald-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 font-semibold text-stone-800">Track Progress</h3>
              <p className="text-sm leading-relaxed text-stone-600">
                Save your answers, track completed studies, and see your spiritual growth journey.
              </p>
            </div>
          </div>
        </div>

        {/* Scripture Quote */}
        <div className="mx-auto max-w-3xl pb-20 text-center">
          <blockquote className="rounded-2xl bg-amber-50 p-8 sm:p-12">
            <p className="text-lg italic text-stone-700 sm:text-xl">
              &ldquo;Your word is a lamp to my feet and a light to my path.&rdquo;
            </p>
            <cite className="mt-4 block text-sm font-medium text-amber-800">
              — Psalm 119:105
            </cite>
          </blockquote>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white px-6 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-stone-500">
          <p>&copy; {new Date().getFullYear()} Bible Study App. Grow in faith, together.</p>
        </div>
      </footer>
    </div>
  );
}
