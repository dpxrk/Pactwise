export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-admin-primary via-admin-secondary to-black flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-admin-accent mb-4">
          Access Denied
        </h2>
        <p className="text-gray-300 mb-8">
          You don't have permission to access the admin portal.
          <br />
          Only administrators and owners can access this area.
        </p>
        <div className="space-x-4">
          <a
            href="/auth/sign-in"
            className="inline-block px-6 py-3 bg-admin-accent text-white rounded hover:bg-opacity-90 transition-colors"
          >
            Sign In with Admin Account
          </a>
          <a
            href={process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}
            className="inline-block px-6 py-3 bg-white text-admin-primary rounded hover:bg-gray-100 transition-colors"
          >
            Back to Main App
          </a>
        </div>
      </div>
    </div>
  );
}