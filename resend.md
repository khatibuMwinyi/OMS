
What each variable does

- `RESEND_API_KEY`: Auth token used by the backend to send emails through Resend.
- `RESEND_FROM_EMAIL`: Verified sender identity in Resend. Use your verified domain address.
- `PUBLIC_APP_URL`: Base URL used in generated temporary share links. Must be your real public URL in production.
- `PUBLIC_SHARE_SECRET`: Secret used to sign temporary public PDF tokens.
- `PUBLIC_LINK_TTL_MINUTES`: Link lifetime in minutes. Default is `120` if not provided.
- `ADMIN_SIGNATURE_IMAGE_PATH`: Default admin signature image used when approving letters (path under `public/`).

Resend account steps

1. Create a Resend account.
2. Add and verify your sending domain in Resend.
3. Add DNS records requested by Resend (SPF/DKIM).
4. Create an API key from Resend dashboard.
5. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in `.env.local`.

How sharing now works

- WhatsApp share button (invoice/receipt/letter):
	- Generates a temporary signed PDF link.
	- Opens WhatsApp with prefilled text + link.
- Email button (invoice/receipt/letter):
	- Prompts for recipient email.
	- Sends PDF attachment via Resend.
	- Does not include a temporary public link in the email body.

Security notes

- Never expose `RESEND_API_KEY` in client code.
- Use a strong random value for `PUBLIC_SHARE_SECRET`.
- Keep TTL short for sensitive documents.


In Resend:

Create account

Verify your sending domain

Add SPF/DKIM DNS records

Create API key

Use a verified sender address for RESEND_FROM_EMAIL

Recommended values:

PUBLIC_APP_URL = your real public app origin in production

PUBLIC_SHARE_SECRET = long random secret

PUBLIC_LINK_TTL_MINUTES = short lifetime for better security

Restart the app after adding env vars.

Test flow:

Open invoices or receipts
Open invoices, receipts, or approved letters