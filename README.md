# Moosermail

The missing inbox for Resend. Read, reply, compose, and automate your Resend emails from a browser or the terminal.

**Web app:** [mooser.email](https://mooser.email) and [app.mooser.email](https://app.mooser.email)
**CLI:** [github.com/moosermail/moosermail](https://github.com/moosermail/moosermail)

## What it is

Resend is built for sending. Moosermail adds everything else: a web inbox, reply and compose, templates, triggers, cron scheduling, pipes (inbound routing rules), delivery tracking, contacts, and a 12-tool MCP server so AI agents can work with your email.

Bring your own Resend API key. Nothing is stored server-side in plaintext. Free forever.

## Stack

- **App:** Next.js 15, TypeScript, Postgres (no ORM)
- **MCP server:** Node.js, MCP SDK, OAuth 2.0
- **Worker:** Node.js cron jobs for scheduled sends and email sync
- **Landing:** Static HTML served by a minimal Node.js server
- **Database:** Postgres 16

## Self-hosting

Requirements: Docker, a domain with Resend inbound routing set up.

**1. Clone and configure**

```bash
git clone https://github.com/moosermail/mooser-web.git
cd mooser-web
cp .env.example .env
```

Edit `.env`:

```bash
POSTGRES_PASSWORD=your-strong-password
JWT_SECRET=your-64-char-hex-string
ENCRYPTION_KEY=your-64-char-hex-string   # AES-256-GCM key for encrypting stored API keys
SEND_ENABLED=true                         # allow MCP server to send email
```

Generate secrets:

```bash
openssl rand -hex 32   # run twice, once for JWT_SECRET and once for ENCRYPTION_KEY
```

**2. Start**

```bash
docker compose up -d
```

Services:

| Container | Port | Purpose |
|---|---|---|
| mooser-landing | 4000 | Landing page |
| mooser-mcp | 4001 | MCP server |
| mooser-app | 4002 | Web app |
| mooser-postgres | 5432 | Database (internal only) |
| mooser-worker | (none) | Cron jobs and email sync |

**3. Reverse proxy**

Point your domains at the ports above. See `nginx/mooser.conf` for a production-ready nginx config with TLS, rate limiting, and security headers.

**4. Resend setup**

- Add your domain in the Resend dashboard
- Set up inbound routing to `inbound-smtp.us-east-1.amazonaws.com`
- Create an API key and add it in the app settings

## Deploying updates

The landing page uses a bind mount, so updates are instant:

```bash
rsync -avz --exclude .git -e "ssh -i ~/.ssh/your-key" landing/ user@your-server:/path/to/app/landing/
```

For app/MCP/worker updates, build the images locally and transfer:

```bash
docker build -t mooser-app ./app
docker save mooser-app | gzip | ssh user@your-server "docker load"
docker compose up -d app
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | Yes | Postgres password |
| `JWT_SECRET` | Yes | 64-char hex string for signing JWTs |
| `ENCRYPTION_KEY` | Yes | 64-char hex string for AES-256-GCM encryption |
| `SEND_ENABLED` | No | Set to `true` to allow MCP server to send email (default: false) |

## Architecture

Each user provides their own Resend API key at signup. Keys are encrypted with AES-256-GCM before storage using `ENCRYPTION_KEY`. The key is decrypted server-side only when making Resend API calls and never returned to the client.

JWTs are signed with `JWT_SECRET` and expire after 7 days. No sessions are stored in the database.

## License

MIT
