// src/app/page.js

export const metadata = {
  title: "LangTerm",
  description: "A modern terminal interface",
};

export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen">
      <h1>Welcome to LangTerm</h1>
      <p>Log in to access your terminal workspace.</p>
    </main>
  );
}
