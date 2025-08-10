'use client';

export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Test Page</h1>
      <p>If you can see this, the webpack issue is resolved\!</p>
      <p>Current time: {new Date().toLocaleTimeString()}</p>
    </div>
  );
}
EOF < /dev/null
