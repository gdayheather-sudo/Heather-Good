import LoginForm from "./LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  return (
    <main className="min-h-screen grid place-items-center px-4 py-12">
      <div className="w-full max-w-md card p-8">
        <div className="mb-6">
          <div className="text-brand-600 font-semibold tracking-tight">
            NDIS Clarity Layer
          </div>
          <h1 className="text-2xl font-semibold mt-1">Sign in</h1>
          <p className="text-sm text-ink-500 mt-1">
            Structured case notes. Report-ready outputs. One click.
          </p>
        </div>
        <LoginForm redirectTo={searchParams.from || "/dashboard"} />
        <div className="mt-6 text-sm text-ink-500">
          New organisation?{" "}
          <a className="text-brand-700 hover:underline" href="/register">
            Create an account
          </a>
        </div>
      </div>
    </main>
  );
}
