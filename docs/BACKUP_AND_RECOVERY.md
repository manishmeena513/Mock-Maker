# MockMaster — Production Backup, Recovery & Disaster Runbook

## 1. Overview & Data Architecture

MockMaster relies on PostgreSQL (managed via Supabase) as its single source of truth for:
* **Authentic Question Bank**: Official PYQs (UPSC, UPPSC, SSC CGL) and vetted Model questions.
* **Import Audit Logs**: Batch imports (`question_import_batches`), file sources, and row indices.
* **Student Progression**: Mock tests (`mock_tests`), question attempts (`mock_questions`), mistake tags, and revision bookmarks (`saved_questions`).
* **Monetization & Audit**: Customer subscriptions (`subscriptions`), payment webhook logs (`payment_webhook_events`), and AI generation logs (`ai_generation_logs`).

---

## 2. Backup Strategy & Retention Policies

### 2.1 Continuous Point-in-Time Recovery (PITR)
* **WAL Archiving**: Supabase continuously archives Write-Ahead Logs (WAL), enabling point-in-time recovery up to the second.
* **Retention Window**: Minimum 7 days on standard production tiers; 30 days on Pro/Enterprise.

### 2.2 Scheduled Logical Backups (Daily Dump)
Automated daily snapshot dumps are taken via GitHub Actions or cloud cron using `pg_dump`:

```bash
# Full Database Logical Dump (Schema + Data)
pg_dump -h db.<PROJECT-REF>.supabase.co \
        -U postgres \
        -d postgres \
        -F c \
        -b \
        -v \
        -f "mockmaster_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### 2.3 Question Bank Cold Storage
Because genuine PYQs represent permanent historical records, the verified question bank is exported to versioned JSON/CSV archives after each import batch is approved:

```bash
# Export approved questions only
psql -h db.<PROJECT-REF>.supabase.co -U postgres -d postgres -c \
  "\copy (SELECT * FROM questions WHERE verification_status = 'approved') TO 'approved_questions_archive.csv' WITH CSV HEADER"
```

---

## 3. Disaster Recovery & Restoration Runbook

### 3.1 Scenario A: Corrupted Question Import or Accidental Deletion
If an import batch introduced invalid data or erroneous duplicates:

1. **Identify the affected batch ID**:
   ```sql
   SELECT id, source_archive_name, total_questions_detected, created_at 
   FROM question_import_batches 
   ORDER BY created_at DESC LIMIT 5;
   ```
2. **Purge only the unapproved questions from that batch**:
   ```sql
   DELETE FROM questions 
   WHERE import_batch_id = '<BATCH_ID>' AND verification_status = 'pending';
   ```
3. **If approved questions were compromised**, use Point-In-Time Recovery in Supabase Console to roll back the database to the minute prior to the batch approval.

### 3.2 Scenario B: Full Database Restoration from Dump
1. Create or provision a clean target PostgreSQL instance.
2. Apply the canonical schema migrations in sequence:
   ```bash
   for file in supabase/migrations/*.sql; do
     psql -h <HOST> -U <USER> -d <DB> -f "$file"
   done
   ```
3. Restore table data from custom dump:
   ```bash
   pg_restore -h <HOST> -U <USER> -d <DB> -v --data-only "mockmaster_backup_<TIMESTAMP>.dump"
   ```
4. Verify record integrity:
   ```sql
   SELECT exam_id, type, count(*) 
   FROM questions 
   WHERE verification_status = 'approved' 
   GROUP BY exam_id, type;
   ```

---

## 4. Webhook Idempotency & Payment Reconciliation

In case of payment network timeouts or repeated webhook deliveries:
1. Every incoming webhook is checked against `payment_webhook_events.event_id`.
2. Duplicate event IDs are returned with HTTP 200 and ignored.
3. Subscription validity can be manually reconciled against Razorpay / Stripe dashboards:
   ```sql
   SELECT s.user_id, s.plan_type, s.status, s.current_period_end, p.event_id
   FROM subscriptions s
   JOIN payment_webhook_events p ON p.payload->>'plan' = s.plan_type
   ORDER BY s.updated_at DESC LIMIT 20;
   ```

---

## 5. Security Credentials & Secrets Rotation

When rotating secrets:
1. **`GEMINI_API_KEY`**: Update in Google AI Studio -> update Vercel Environment Variables -> Redeploy.
2. **`RAZORPAY_KEY_SECRET` / `STRIPE_SECRET_KEY`**:
   - Generate secondary key in provider dashboard.
   - Update `RAZORPAY_KEY_SECRET` in environment variables.
   - Test test-charge endpoint.
   - Revoke previous key in provider dashboard.
3. **`SUPABASE_SERVICE_ROLE_KEY`**:
   - Rotate in Supabase API settings.
   - Update in Vercel project settings and trigger zero-downtime redeploy.
