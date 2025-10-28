#!/usr/bin/env node

const url = 'http://127.0.0.1:54321/auth/v1/token?grant_type=password';
const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const payload = {
  email: 'demo@pactwise.com',
  password: 'Demo123!@#'
};

fetch(url, {
  method: 'POST',
  headers: {
    'apikey': apikey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
  .then(response => response.json())
  .then(data => {
    if (data.access_token) {
      console.log('✅ Login successful!');
      console.log('User:', data.user?.email);
      console.log('Token received');
    } else {
      console.log('❌ Login failed');
      console.log('Error:', JSON.stringify(data, null, 2));
    }
  })
  .catch(error => {
    console.error('❌ Request failed:', error);
  });
