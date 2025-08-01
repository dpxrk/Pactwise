export default function TestPage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Test Page</h1>
      <p>If you can see this, Next.js is working!</p>
      <p>The landing page might be failing due to missing environment variables.</p>
      <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Required Environment Variables:</h2>
        <ul>
          <li>NEXT_PUBLIC_CONVEX_URL</li>
          <li>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</li>
          <li>CLERK_SECRET_KEY</li>
        </ul>
      </div>
    </div>
  );
}