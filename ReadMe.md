Critical Requirements

Privacy Policy & Terms of Service: Two pages with real content, accessible from the app footer. Missing pages may lead to project rejection during peer review.

README.md must include:
Italicized first line with test logins, Description, Setup Instructions, Resources (including AI usage), and the following sections:
Team Information (roles), Project Management, Technical Stack, Database Schema, Features, Modules with point calculation, Individual Contributions.

High Priority

2FA Completion --> Done

Add backup codes --> Done

Implement rate limiting / account lockout after failed attempts

Use existing DB fields twofa_attempts and twofa_locked_until.

Tournament Anonymous Mode

Local tournaments must work without authentication.

Game Statistics

Stats currently use the matches table only.

Results from the games table (tournaments) must also be included for correct win/loss tracking.

Security

XSS Protection: Sanitize user content (e.g., DOMPurify) and avoid unsafe innerHTML.

Security Headers: Add Helmet.js (CSP, X-Frame-Options, etc.).

CSRF Protection: Add CSRF middleware for state-changing requests.

Rate Limiting: Protect login, register, and 2FA endpoints.

Optional Module Choice (1 point)

Advanced Chat Features (block users, game invites, notifications, profile access, typing indicators, read receipts)
or

OAuth 2.0 login (Google/GitHub) – simpler and recommended.

Code Quality

No browser console errors or warnings (latest Chrome).

Clean TypeScript build (make check-frontend).

Add .env.example and remove .env secrets from the repository.

Additional Checks

Add footer links to legal pages.

Verify multi-user simultaneous support (WebSockets, sessions).

Ensure compatibility with latest stable Chrome.
