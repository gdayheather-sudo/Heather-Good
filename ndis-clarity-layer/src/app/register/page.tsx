import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <main className="min-h-screen grid place-items-center px-4 py-12">
      <div className="w-full max-w-md card p-8">
        <div className="mb-6">
          <div className="text-brand-600 font-semibold tracking-tight">
            NDIS Clarity Layer
          </div>
          <h1 className="text-2xl font-semibold mt-1">Create your organisation</h1>
          <p className="text-sm text-ink-500 mt-1">
            You'll be the first admin. Add team members from the admin area
            once you're in.
          </p>
        </div>
        <RegisterForm />
        <div className="mt-6 text-sm text-ink-500">
          Already have an account?{" "}
          <a className="text-brand-700 hover:underline" href="/login">
            Sign in
          </a>
        </div>
      </div>
    </main>
  );
}
