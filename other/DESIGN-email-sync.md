# Email Sync System Design

Moosermail's permanent email store. Not a cache. Resend deletes emails after 30 days, so this is the system of record.

---

## Current State (what exists now)

**Inbox page** (`/inbox/page.tsx`): Calls Resend's `GET /emails/receiving?limit=100` on every page load. Returns at most 100 emails. No pagination. No history beyond the most recent 100.

**Email detail** (`/inbox/[id]/page.tsx`): Calls `GET /emails/receiving/:id` for the full body. If Resend has deleted the email (>30 days), the page 404s.

**Search** (`/api/search/route.ts`): Fetches 100 emails from Resend, does `string.includes()` in Node. Misses 99%+ of a real inbox.

**Sync worker** (`worker/sync-emails.js`): Polls `GET /emails/receiving?limit=100` and `GET /emails?limit=100` every 60 seconds. Upserts into `cached_emails`. Only sees the newest 100 emails per direction. No cursor pagination.

**Webhooks** (`/api/webhooks/resend/[userId]/route.ts`): Accepts delivery events (sent, delivered, opened, bounced, etc.) and logs them to `delivery_events`. Does NOT handle `email.received` or store email content.

**Schema** (`cached_emails`): Has the right shape -- `id, user_id, inbox_id, direction, from_address, to_addresses, subject, body_text, body_html, created_at` with FTS via tsvector. But it's being treated as an expendable cache, not a permanent store.

---

## Architecture

Three layers, each covering a different failure mode:

```
Layer 1: Webhooks (realtime, <1s latency)
    email.received / email.sent fires
    -> webhook handler writes metadata row immediately
    -> background fetch fills in the body

Layer 2: Polling (catch-up, 60s interval)
    Worker checks Resend API for recent emails
    -> Finds any emails the webhook missed
    -> Fills in bodies for metadata-only rows

Layer 3: Backfill (one-time, on signup or manual trigger)
    Walk full Resend history with cursor pagination
    -> Runs as a background job
    -> Handles the "user has 2000 existing emails" case
```

---

## 1. Webhook Flow

### What fires and what it contains

Resend's `email.received` webhook payload:

```json
{
  "type": "email.received",
  "data": {
    "email_id": "recv_abc123",
    "from": "alice@example.com",
    "to": ["bob@yourdomain.com"],
    "subject": "Hey",
    "created_at": "2026-03-25T10:00:00.000Z"
  }
}
```

No body. No `text`. No `html`. Just metadata. You need a follow-up API call to `GET /emails/receiving/:email_id` to get the full content.

### User mapping

The per-user webhook endpoint already solves this: `POST /api/webhooks/resend/{userId}`. The userId is baked into the URL. The webhook handler looks up that user's `webhook_secret` from `user_settings`, verifies the svix signature, and proceeds. No from-address guessing needed.

### The handler, step by step

```
1. Verify svix signature (already exists)
2. Parse event type and email_id
3. INSERT INTO cached_emails with metadata only:
     - id = email_id
     - user_id = userId (from URL)
     - direction = 'received' (for email.received) or 'sent' (for email.sent)
     - from_address, to_addresses, subject, created_at from webhook payload
     - body_text = '', body_html = ''
     - sync_status = 'metadata_only'
   ON CONFLICT (user_id, id) DO NOTHING  -- idempotent
4. INSERT INTO sync_queue (email_id, user_id, inbox_id, priority, created_at)
     - priority = 'high' for webhook-triggered fetches
   ON CONFLICT DO NOTHING  -- idempotent
5. Return 200 immediately
```

Body fetch happens out-of-band. The webhook handler never calls Resend's API. It returns fast, every time.

### Why not fetch the body synchronously?

Three reasons:

1. **Webhook timeout.** Resend expects a response within 5 seconds. Fetching the body takes another round-trip to Resend (decrypting the API key, hitting their API, processing the response). Too slow and fragile.

2. **Eventual consistency.** Resend sometimes fires `email.received` before the body is available via the API. A 1-2 second race condition. If you fetch immediately and get a 404, you've wasted the attempt.

3. **Decoupling.** The webhook handler doesn't need the user's Resend API key. It just logs what Resend tells it. The worker -- which already has key decryption -- handles the fetch.

---

## 2. Sync Queue

New table. Tracks emails that need their body fetched.

```sql
CREATE TABLE IF NOT EXISTS sync_queue (
  id          serial PRIMARY KEY,
  email_id    text NOT NULL,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  inbox_id    uuid REFERENCES resend_keys(id) ON DELETE SET NULL,
  direction   text NOT NULL DEFAULT 'received',
  priority    text NOT NULL DEFAULT 'normal',  -- 'high' (webhook) | 'normal' (poll) | 'low' (backfill)
  attempts    int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, email_id)
);

CREATE INDEX idx_sync_queue_due ON sync_queue(next_attempt_at)
  WHERE attempts < max_attempts;
CREATE INDEX idx_sync_queue_user ON sync_queue(user_id);
```

The worker processes this queue:

```
1. SELECT * FROM sync_queue
   WHERE attempts < max_attempts AND next_attempt_at <= NOW()
   ORDER BY priority ASC, created_at ASC  -- high priority first
   LIMIT 50
   FOR UPDATE SKIP LOCKED  -- multiple workers safe

2. For each item:
   a. Get user's API key (decrypt from resend_keys)
   b. GET /emails/receiving/:email_id (or /emails/:email_id for sent)
   c. If 200:
      - UPDATE cached_emails SET body_text, body_html, sync_status = 'complete'
      - DELETE FROM sync_queue WHERE id = ...
   d. If 404:
      - Increment attempts, set next_attempt_at = NOW() + exponential_backoff
      - After max_attempts: mark cached_emails.sync_status = 'body_unavailable'
      - DELETE FROM sync_queue
   e. If 429 (rate limited):
      - Set next_attempt_at = NOW() + 30 seconds
      - Don't increment attempts (not the email's fault)
   f. If 5xx:
      - Increment attempts, exponential backoff
```

Backoff schedule: 5s, 15s, 45s, 135s, 405s. Five attempts over ~10 minutes total. After that, give up on the body -- we still have the metadata.

---

## 3. Schema Changes

### cached_emails -- the permanent store

Add these columns to the existing table:

```sql
-- Sync status tracking
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS sync_status text NOT NULL DEFAULT 'complete';
  -- 'metadata_only' | 'complete' | 'body_unavailable'

-- Threading support
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS message_id text;      -- RFC 822 Message-ID header
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS in_reply_to text;     -- In-Reply-To header
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS references_header text[]; -- References header (for threading)
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS thread_id text;       -- computed thread identifier

-- Attachment metadata (not the files themselves)
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]';
  -- [{id, filename, content_type, size}]

-- Headers blob for anything we missed
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS headers jsonb;

-- Source tracking
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'poll';
  -- 'webhook' | 'poll' | 'backfill' | 'send_api'

-- BCC and reply_to
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS bcc_addresses text[] NOT NULL DEFAULT '{}';
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS reply_to_address text;

-- Indexes for threading
CREATE INDEX IF NOT EXISTS idx_cached_emails_thread ON cached_emails(user_id, thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cached_emails_message_id ON cached_emails(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cached_emails_sync_status ON cached_emails(sync_status) WHERE sync_status != 'complete';
```

### Why NOT store raw .eml

Resend provides a signed URL to download the original .eml file. That URL expires. We'd need to fetch it immediately and store it somewhere.

Skip it. The individual fields (from, to, subject, body, headers) are more useful than a raw .eml blob. If you ever need to reconstruct a .eml, you can do it from the parsed fields. The only thing you'd lose is exact byte-for-byte reproducibility, which doesn't matter for a webmail client.

If you change your mind later, add a `raw_eml` TEXT column and store it. But don't block the first version on this.

### Why NOT store attachment content

Attachments are a storage and complexity bomb. Resend returns attachment metadata (filename, content_type, size) in the email detail response. For v1:

- Store attachment metadata as JSONB on the cached_emails row
- When the user clicks "download," proxy the request through our API to Resend
- If the email is <30 days old, Resend still has it
- If >30 days, the attachment is lost

For v2, download attachment content to S3 during the body-fetch step. Add an `email_attachments` table with a `storage_key` column pointing to S3. Don't use Postgres BYTEA -- a 10MB attachment as BYTEA would bloat the table, slow vacuums, and wreck pg_dump.

---

## 4. Reliability: Belt and Suspenders

### Webhook failure modes

| Failure | Consequence | Recovery |
|---------|-------------|----------|
| Webhook endpoint returns 5xx | Resend retries: 3 attempts over ~4 hours (exponential backoff) | If all 3 fail, polling catches it within 60s |
| Server down for 1 hour | Resend's retries may all expire | Polling catches everything on restart |
| Webhook fires before body available | Sync queue fetch returns 404 | Retries with backoff; succeeds within seconds |
| Duplicate webhook (Resend retry + original both arrive) | `ON CONFLICT DO NOTHING` on cached_emails | Idempotent by design |
| Webhook signature verification fails | 401 response, email not recorded | Polling catches it |
| User hasn't set webhook secret | 403 response, endpoint rejects | User needs to configure it; polling still works |

### Polling as the safety net

The existing 60-second poll cycle stays. But it changes behavior:

```
Old: Fetch 100 emails, upsert all of them every cycle.
New: Fetch 100 emails, check which ones are already in cached_emails.
     Only enqueue missing ones to sync_queue.
     Much cheaper -- most cycles find 0 new emails.
```

The poll step becomes a reconciliation pass, not the primary ingestion path.

### Tracking completeness

Every cached_emails row has `sync_status`:

- `metadata_only` -- webhook fired, we have envelope data, body fetch pending
- `complete` -- full body synced
- `body_unavailable` -- all fetch attempts failed (body never available, or >30 days)

The inbox UI treats `metadata_only` rows as real emails. Shows subject, from, date. When the user clicks to read, if the body is empty, show a "syncing..." indicator and trigger a priority fetch.

### Monitoring

```sql
-- Emails stuck in metadata_only for >5 minutes
SELECT COUNT(*) FROM cached_emails
WHERE sync_status = 'metadata_only'
  AND synced_at < NOW() - INTERVAL '5 minutes';

-- Sync queue depth
SELECT priority, COUNT(*) FROM sync_queue
WHERE attempts < max_attempts
GROUP BY priority;

-- Failed fetches in last hour
SELECT COUNT(*) FROM sync_queue
WHERE attempts >= max_attempts
  AND created_at > NOW() - INTERVAL '1 hour';
```

Expose these as a `/api/sync-status` endpoint. Show them on an admin dashboard. Alert if metadata_only count exceeds 50 or sync_queue depth exceeds 500.

---

## 5. Initial Backfill

When a user adds their Resend API key, they might have thousands of existing emails. The webhook won't fire for historical emails. We need to walk the full history.

### How Resend pagination works

```
GET /emails/receiving?limit=100            -> page 1 (newest 100)
GET /emails/receiving?limit=100&after=<id> -> page 2 (next 100)
... repeat until empty response
```

Same pattern for sent: `GET /emails?limit=100&after=<id>`.

### Backfill job

New table:

```sql
CREATE TABLE IF NOT EXISTS backfill_jobs (
  id          serial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  inbox_id    uuid NOT NULL REFERENCES resend_keys(id) ON DELETE CASCADE,
  direction   text NOT NULL,  -- 'received' | 'sent'
  status      text NOT NULL DEFAULT 'pending',  -- 'pending' | 'running' | 'complete' | 'error'
  cursor      text,           -- Resend after= cursor for resumability
  total_found int NOT NULL DEFAULT 0,
  total_synced int NOT NULL DEFAULT 0,
  error_message text,
  started_at  timestamptz,
  completed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inbox_id, direction)
);
```

Flow:

```
1. User adds API key via POST /api/inboxes
2. After successful key validation, INSERT two backfill_jobs:
   - (inbox_id, 'received', 'pending')
   - (inbox_id, 'sent', 'pending')
3. Worker picks up pending jobs every tick:
   a. Fetch one page: GET /emails/receiving?limit=100&after={cursor}
   b. For each email in the response:
      - INSERT metadata into cached_emails (sync_status = 'metadata_only')
      - INSERT into sync_queue (priority = 'low')
   c. Update backfill_jobs: cursor = last email id, total_found += page size
   d. If response has fewer than 100 emails: mark job 'complete'
   e. Sleep 200ms between pages (rate limit courtesy)
4. Sync queue worker processes body fetches in priority order:
   high (webhook) > normal (poll) > low (backfill)
```

### Rate math

User has 2000 emails:
- List calls: 2000 / 100 = 20 requests
- Body fetch calls: 2000 requests
- Total: 2020 requests at 200ms spacing = ~404 seconds (~7 minutes)
- At 5 req/sec Resend limit: 2020 / 5 = 404 seconds (same)

Seven minutes for a full backfill. Acceptable.

### Progress reporting

```
GET /api/sync-status
{
  "backfill": {
    "received": { "status": "running", "found": 1200, "synced": 450 },
    "sent": { "status": "pending", "found": 0, "synced": 0 }
  },
  "queue_depth": 750,
  "total_emails": 450,
  "metadata_only": 750
}
```

The inbox UI shows a subtle banner: "Syncing your inbox... 450 / 1,200". Disappears when complete.

### Lazy vs. eager body fetch

Eager. Fetch all bodies during backfill. Reasons:

1. Resend deletes after 30 days. If a user signs up and has emails from 25 days ago, we have 5 days to fetch bodies before they're gone forever.
2. FTS doesn't work on metadata-only rows. Users expect search to find old emails.
3. The "lazy on first view" UX is bad. User clicks an email, sees a loading spinner, waits 500ms for the body fetch. For every single email. No.

Exception: if the backfill job finds emails older than 28 days, bump those to `priority = 'high'` in the sync queue. They're about to expire.

---

## 6. Sent Email Sync

### Emails sent through Moosermail

When the user sends via `POST /api/send`, we already have everything -- the to, subject, body, html. Write it directly to `cached_emails` with `sync_status = 'complete'` and `source = 'send_api'`. No API round-trip needed.

Change in `/api/send/route.ts`:

```
After successful resendFetch("POST", "/emails", payload):
  INSERT INTO cached_emails (
    id = result.id,
    user_id, inbox_id, direction = 'sent',
    from_address, to_addresses, cc_addresses, subject,
    body_text, body_html,
    sync_status = 'complete', source = 'send_api',
    created_at = NOW()
  ) ON CONFLICT (user_id, id) DO UPDATE SET
    sync_status = 'complete',
    body_text = EXCLUDED.body_text,
    body_html = EXCLUDED.body_html;
```

### Emails sent before signup

The backfill job handles these. `GET /emails?limit=100&after=<cursor>` walks sent history the same way as received.

### email.sent webhook

When the user configures webhooks, `email.sent` fires for outbound emails. Same pattern as `email.received`: log metadata, enqueue body fetch. But if the email was sent through our API, we already have the full content, so the `ON CONFLICT DO NOTHING` on cached_emails means the webhook is a no-op for those. It only matters for emails sent via Resend's dashboard or other integrations.

---

## 7. Threading

### Thread ID computation

Emails form threads via three headers: `Message-ID`, `In-Reply-To`, and `References`. Resend might or might not expose these. If they do:

```
thread_id = first Message-ID in the References chain (the original message)
```

If Resend doesn't expose these headers, fall back to subject-based threading:

```
thread_id = hash(normalize_subject(subject))
```

Where `normalize_subject` strips "Re:", "Fwd:", "RE:", "FW:" prefixes and lowercases.

Subject-based threading is imperfect (multiple unrelated threads with the same subject get merged) but good enough for v1. Gmail uses the same fallback.

### Thread view query

```sql
SELECT * FROM cached_emails
WHERE user_id = $1 AND thread_id = $2
ORDER BY created_at ASC;
```

The inbox list groups by thread_id, showing the most recent email per thread:

```sql
SELECT DISTINCT ON (thread_id) *
FROM cached_emails
WHERE user_id = $1 AND direction = 'received'
ORDER BY thread_id, created_at DESC;
```

---

## 8. Transition Plan

### Phase 1: Dual-source (now)

Both Resend API and Postgres serve the inbox. The app prefers Postgres when the email exists there, falls back to Resend.

Changes:
- Inbox page: `SELECT FROM cached_emails WHERE user_id = $1 AND direction = 'received' ORDER BY created_at DESC LIMIT 100`. If count < 20 and sync_state shows never synced, fall back to Resend API (legacy behavior).
- Email detail page: `SELECT FROM cached_emails WHERE user_id = $1 AND id = $2`. If not found or `sync_status = 'metadata_only'`, try Resend API, then write the result back to Postgres.
- Search: Use the FTS query against cached_emails. Fall back to Resend API search if cached_emails is empty for the user.

### Phase 2: Postgres-primary (after backfill is proven)

Remove all Resend API reads from the hot path. The inbox page, email detail, search, and sent folder all read exclusively from Postgres.

Resend API is only used for:
- Sending emails
- Body fetches in the sync queue
- Attachment downloads (proxy)

### Phase 3: Kill the Resend read path (after 30 days)

Once every active user has been through a full backfill and 30 days have passed, all emails in Resend have either been synced or have expired. Remove the Resend API fallback code entirely.

### During transition: mixed state handling

The inbox page might show a mix of emails from Postgres (with full bodies) and placeholder rows (metadata_only). This is fine. The list view only needs subject/from/date, which metadata_only rows have. When the user clicks a metadata_only email:

1. Check if the body fetch is already queued
2. If not, enqueue with `priority = 'high'`
3. Show the email detail page with a "Loading content..." placeholder
4. Client polls `/api/emails/:id/status` every 2 seconds (or use server-sent events)
5. Body fetch completes, client gets the content

In practice, this race window is tiny -- the webhook triggers a body fetch within seconds. Users will almost never see the placeholder.

---

## 9. Updated Webhook Handler

The per-user endpoint at `/api/webhooks/resend/[userId]/route.ts` needs to handle `email.received` and `email.sent` in addition to the delivery events it already handles.

```typescript
// Pseudo-code for the new handler logic:

switch (eventType) {
  case "email.received":
  case "email.sent": {
    const direction = eventType === "email.received" ? "received" : "sent";

    // Upsert metadata into cached_emails
    await query(`
      INSERT INTO cached_emails (id, user_id, inbox_id, direction, from_address,
        to_addresses, subject, created_at, sync_status, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'metadata_only', 'webhook')
      ON CONFLICT (user_id, id) DO NOTHING
    `, [emailId, userId, inboxId, direction, fromAddr, toAddrs, subject, createdAt]);

    // Enqueue body fetch
    await query(`
      INSERT INTO sync_queue (email_id, user_id, inbox_id, direction, priority)
      VALUES ($1, $2, $3, $4, 'high')
      ON CONFLICT (user_id, email_id) DO NOTHING
    `, [emailId, userId, inboxId, direction]);

    break;
  }

  case "email.delivered":
  case "email.bounced":
  case "email.opened":
  case "email.clicked":
  case "email.complained": {
    // Existing delivery event logging (unchanged)
    await query(
      "INSERT INTO delivery_events (...) VALUES (...)",
      [...]
    );

    // Also update last_event on cached_emails if the row exists
    await query(`
      UPDATE cached_emails SET headers = jsonb_set(
        COALESCE(headers, '{}'), '{last_event}', to_jsonb($2::text)
      ) WHERE user_id = $1 AND id = $3
    `, [userId, eventType.replace("email.", ""), emailId]);

    break;
  }
}
```

The webhook handler still needs the svix secret to verify signatures but does NOT need the Resend API key. That's important -- the body fetch worker handles all API calls.

---

## 10. Updated Worker

### Sync queue processor

New function in the worker, runs every 5 seconds:

```javascript
async function processSyncQueue() {
  const batch = await pool.query(`
    SELECT sq.*, rk.ciphertext, rk.iv, rk.tag
    FROM sync_queue sq
    JOIN resend_keys rk ON sq.inbox_id = rk.id
    WHERE sq.attempts < sq.max_attempts
      AND sq.next_attempt_at <= NOW()
    ORDER BY
      CASE sq.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
      sq.created_at ASC
    LIMIT 20
    FOR UPDATE OF sq SKIP LOCKED
  `);

  for (const item of batch.rows) {
    const apiKey = decrypt(item);
    const endpoint = item.direction === 'sent'
      ? `/emails/${item.email_id}`
      : `/emails/receiving/${item.email_id}`;

    try {
      const res = await fetch(`${RESEND_API}${endpoint}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        const email = await res.json();
        await pool.query(`
          UPDATE cached_emails SET
            body_text = $2, body_html = $3,
            sync_status = 'complete',
            attachments = $4,
            headers = $5,
            message_id = $6,
            in_reply_to = $7,
            synced_at = NOW()
          WHERE user_id = $8 AND id = $1
        `, [
          item.email_id,
          email.text || '', email.html || '',
          JSON.stringify(email.attachments || []),
          JSON.stringify(email.headers || {}),
          email.message_id || null,
          email.in_reply_to || null,
          item.user_id
        ]);
        await pool.query("DELETE FROM sync_queue WHERE id = $1", [item.id]);
      } else if (res.status === 404) {
        // Email not available (yet, or ever)
        await handleFetchFailure(pool, item, `404 Not Found`);
      } else if (res.status === 429) {
        // Rate limited -- retry without incrementing attempts
        await pool.query(
          "UPDATE sync_queue SET next_attempt_at = NOW() + INTERVAL '30 seconds' WHERE id = $1",
          [item.id]
        );
      } else {
        await handleFetchFailure(pool, item, `HTTP ${res.status}`);
      }
    } catch (err) {
      await handleFetchFailure(pool, item, err.message);
    }

    await sleep(API_DELAY_MS);
  }
}

async function handleFetchFailure(pool, item, error) {
  const newAttempts = item.attempts + 1;
  if (newAttempts >= item.max_attempts) {
    // Give up on body fetch
    await pool.query(
      "UPDATE cached_emails SET sync_status = 'body_unavailable' WHERE user_id = $1 AND id = $2",
      [item.user_id, item.email_id]
    );
    await pool.query("DELETE FROM sync_queue WHERE id = $1", [item.id]);
  } else {
    const backoff = Math.pow(3, newAttempts) * 5; // 5s, 15s, 45s, 135s, 405s
    await pool.query(
      "UPDATE sync_queue SET attempts = $2, last_error = $3, next_attempt_at = NOW() + ($4 || ' seconds')::interval WHERE id = $1",
      [item.id, newAttempts, error.slice(0, 500), backoff]
    );
  }
}
```

### Backfill processor

Runs every 10 seconds. Picks up one pending backfill job at a time:

```javascript
async function processBackfills() {
  const job = await pool.query(`
    SELECT bj.*, rk.ciphertext, rk.iv, rk.tag
    FROM backfill_jobs bj
    JOIN resend_keys rk ON bj.inbox_id = rk.id
    WHERE bj.status IN ('pending', 'running')
    ORDER BY bj.created_at ASC
    LIMIT 1
    FOR UPDATE OF bj SKIP LOCKED
  `);

  if (job.rows.length === 0) return;
  const bj = job.rows[0];

  await pool.query(
    "UPDATE backfill_jobs SET status = 'running', started_at = COALESCE(started_at, NOW()) WHERE id = $1",
    [bj.id]
  );

  const apiKey = decrypt(bj);
  const baseUrl = bj.direction === 'sent' ? '/emails' : '/emails/receiving';
  const url = bj.cursor
    ? `${RESEND_API}${baseUrl}?limit=100&after=${bj.cursor}`
    : `${RESEND_API}${baseUrl}?limit=100`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const emails = data.data || data || [];

    for (const e of emails) {
      // Upsert metadata
      await pool.query(`
        INSERT INTO cached_emails (id, user_id, inbox_id, direction, from_address,
          to_addresses, subject, created_at, sync_status, source)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'metadata_only', 'backfill')
        ON CONFLICT (user_id, id) DO NOTHING
      `, [e.id, bj.user_id, bj.inbox_id, bj.direction,
          e.from || '', normalizeAddresses(e.to), e.subject || '', e.created_at]);

      // Determine priority: emails about to expire get high priority
      const age = Date.now() - new Date(e.created_at).getTime();
      const daysOld = age / (1000 * 60 * 60 * 24);
      const priority = daysOld > 28 ? 'high' : 'low';

      await pool.query(`
        INSERT INTO sync_queue (email_id, user_id, inbox_id, direction, priority)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, email_id) DO NOTHING
      `, [e.id, bj.user_id, bj.inbox_id, bj.direction, priority]);
    }

    const lastId = emails.length > 0 ? emails[emails.length - 1].id : null;
    const done = emails.length < 100;

    await pool.query(`
      UPDATE backfill_jobs SET
        cursor = $2,
        total_found = total_found + $3,
        status = $4,
        completed_at = $5
      WHERE id = $1
    `, [bj.id, lastId, emails.length, done ? 'complete' : 'running',
        done ? new Date().toISOString() : null]);

  } catch (err) {
    await pool.query(
      "UPDATE backfill_jobs SET status = 'error', error_message = $2 WHERE id = $1",
      [bj.id, err.message.slice(0, 500)]
    );
  }
}
```

### Updated tick schedule

```javascript
// Existing
setInterval(tick, 10_000);            // cron + pipes + queue
setInterval(statusTick, 60_000);       // health checks
setInterval(syncTick, 60_000);         // polling reconciliation

// New
setInterval(processSyncQueue, 5_000);  // body fetches
setInterval(processBackfills, 10_000); // history walking
```

---

## 11. Sent Email Capture at Send Time

In `/api/send/route.ts`, after the `resendFetch` call succeeds:

```typescript
// Store sent email in permanent database
const toList = Array.isArray(body.to) ? body.to : [body.to];
try {
  await query(`
    INSERT INTO cached_emails (id, user_id, inbox_id, direction, from_address,
      to_addresses, cc_addresses, subject, body_text, body_html,
      sync_status, source, created_at)
    VALUES ($1, $2, $3, 'sent', $4, $5, $6, $7, $8, $9,
      'complete', 'send_api', NOW())
    ON CONFLICT (user_id, id) DO UPDATE SET
      body_text = EXCLUDED.body_text,
      body_html = EXCLUDED.body_html,
      sync_status = 'complete',
      source = 'send_api'
  `, [result.id, user.userId, inboxId, creds.fromAddress, toList,
      body.cc ? [body.cc] : [], body.subject, text,
      body.html ? (sigEnabled ? body.html + SIG_HTML : body.html) : '']);
} catch (err) {
  // Non-fatal. The email was sent; we just failed to cache it locally.
  // The polling worker will pick it up.
  console.error("Failed to cache sent email:", err);
}
```

Non-blocking, non-fatal. The email was sent even if the cache write fails.

---

## 12. Inbox Page Cutover

### Phase 1 query (dual-source)

```typescript
// Try Postgres first
const cached = await query(`
  SELECT id, from_address AS from, to_addresses AS to, subject,
    LEFT(body_text, 200) AS text, created_at, sync_status
  FROM cached_emails
  WHERE user_id = $1 AND direction = 'received'
  ORDER BY created_at DESC
  LIMIT 100
`, [user.userId]);

if (cached.rows.length > 0) {
  // Postgres has data -- use it
  emails = cached.rows;
} else {
  // No cached data yet (backfill hasn't run). Fall back to Resend API.
  const data = await resendFetch(creds.apiKey, "GET", "/emails/receiving?limit=100");
  emails = data.data || [];
}
```

### Phase 2 query (Postgres-only, with pagination)

```typescript
const page = parseInt(searchParams.get("page") || "1");
const limit = 50;
const offset = (page - 1) * limit;

const [emailsResult, countResult] = await Promise.all([
  query(`
    SELECT id, from_address, to_addresses, subject,
      LEFT(body_text, 200) AS preview, created_at, sync_status,
      thread_id, attachments
    FROM cached_emails
    WHERE user_id = $1 AND direction = 'received'
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `, [user.userId, limit, offset]),
  query(`
    SELECT COUNT(*) FROM cached_emails
    WHERE user_id = $1 AND direction = 'received'
  `, [user.userId]),
]);
```

Real pagination. Not limited to 100 emails. Sub-millisecond queries.

---

## 13. Open Questions

**Q: Should the polling reconciliation fetch bodies inline or use the sync queue?**
A: Use the sync queue. The poll step inserts metadata rows and enqueues body fetches, just like the webhook handler. One path for all body fetches.

**Q: What about Resend accounts with multiple domains?**
A: Each domain maps to a different Resend API key, which maps to a different `resend_keys` row and inbox_id. The sync system already handles multiple inboxes per user via the inbox_id foreign key.

**Q: How do we handle Resend plan limits?**
A: Resend free tier: 100 emails/day sent, 10 req/sec API. The 200ms delay between API calls keeps us at 5 req/sec per user. For users on paid plans, we could increase throughput. Track the user's plan tier in `resend_keys` and adjust delays accordingly. Not critical for v1.

**Q: What if a user's Resend key gets revoked?**
A: sync_state.error_count increments on 401 responses. After 10 consecutive failures, we stop trying. The user sees "Sync paused -- check your API key" in the UI. Resets when they update their key.

**Q: Do we need to handle Resend webhook IP allowlisting?**
A: No. Resend uses svix for webhook delivery with signature verification. The signature check is the authentication. IP allowlisting is an optional additional layer we don't need.

---

## 14. Migration SQL (complete)

```sql
-- Migration 007: Webhook-first email sync

BEGIN;

-- New columns on cached_emails
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS sync_status text NOT NULL DEFAULT 'complete';
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'poll';
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS message_id text;
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS in_reply_to text;
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS references_header text[];
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS thread_id text;
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]';
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS headers jsonb;
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS bcc_addresses text[] NOT NULL DEFAULT '{}';
ALTER TABLE cached_emails ADD COLUMN IF NOT EXISTS reply_to_address text;

CREATE INDEX IF NOT EXISTS idx_cached_emails_thread
  ON cached_emails(user_id, thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cached_emails_message_id
  ON cached_emails(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cached_emails_sync_status
  ON cached_emails(sync_status) WHERE sync_status != 'complete';

-- Sync queue for body fetches
CREATE TABLE IF NOT EXISTS sync_queue (
  id              serial PRIMARY KEY,
  email_id        text NOT NULL,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  inbox_id        uuid REFERENCES resend_keys(id) ON DELETE SET NULL,
  direction       text NOT NULL DEFAULT 'received',
  priority        text NOT NULL DEFAULT 'normal',
  attempts        int NOT NULL DEFAULT 0,
  max_attempts    int NOT NULL DEFAULT 5,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, email_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_due
  ON sync_queue(next_attempt_at) WHERE attempts < max_attempts;
CREATE INDEX IF NOT EXISTS idx_sync_queue_user
  ON sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority
  ON sync_queue(priority, created_at ASC);

-- Backfill jobs for initial history import
CREATE TABLE IF NOT EXISTS backfill_jobs (
  id              serial PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  inbox_id        uuid NOT NULL REFERENCES resend_keys(id) ON DELETE CASCADE,
  direction       text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  cursor          text,
  total_found     int NOT NULL DEFAULT 0,
  total_synced    int NOT NULL DEFAULT 0,
  error_message   text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inbox_id, direction)
);

CREATE INDEX IF NOT EXISTS idx_backfill_jobs_status
  ON backfill_jobs(status) WHERE status IN ('pending', 'running');

COMMIT;
```

---

## 15. Implementation Order

1. **Run migration 007.** Adds columns and tables. Non-destructive, no downtime.
2. **Update webhook handler** to write `email.received` and `email.sent` to cached_emails + sync_queue.
3. **Build sync queue processor** in the worker. Body fetches start flowing.
4. **Build backfill processor** in the worker. History imports start on next inbox creation.
5. **Trigger backfill for existing users.** INSERT backfill_jobs for every existing inbox_id.
6. **Update /api/send** to write sent emails to cached_emails at send time.
7. **Update inbox page** to dual-source mode (Postgres preferred, Resend fallback).
8. **Update email detail page** to read from Postgres first.
9. **Update search** to use FTS on cached_emails.
10. **Wait 30 days.** All emails that existed in Resend at cutover time have now either been synced or expired.
11. **Remove Resend API reads** from inbox, email detail, and search. Postgres is the sole source.
12. **Update polling** to be reconciliation-only (no more full upserts).
