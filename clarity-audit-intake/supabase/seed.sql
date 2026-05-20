-- Create a test intake session and print the link to visit.
-- Run AFTER schema.sql. Adjust name/email/date as needed.

insert into intake_sessions (token, client_name, client_email, status, payment_confirmed, audit_date)
values (
  'test-' || substr(md5(random()::text), 1, 16),
  'Jane Smith',
  'jane@example.com',
  'pending',
  true,
  now() + interval '7 days'
)
returning
  token,
  'http://localhost:3000/audit/intake/' || token as intake_url;
