import { createClient } from "@supabase/supabase-js";

const requiredEnv = ["OLD_SUPABASE_URL", "OLD_SERVICE_ROLE_KEY", "NEW_SUPABASE_URL", "NEW_SERVICE_ROLE_KEY"];
const missing = requiredEnv.filter((name) => !process.env[name]);

if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  console.error("Set them in PowerShell, then run: node scripts/copy-storage.mjs");
  process.exit(1);
}

const oldSupabase = createClient(
  process.env.OLD_SUPABASE_URL,
  process.env.OLD_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const newSupabase = createClient(
  process.env.NEW_SUPABASE_URL,
  process.env.NEW_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const buckets = (process.env.STORAGE_BUCKETS || "products,gallery,blog-images,services,service-images")
  .split(",")
  .map((bucket) => bucket.trim())
  .filter(Boolean);

async function listAllFiles(client, bucket, prefix = "") {
  const files = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    if (!data?.length) break;

    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;

      if (item.id === null) {
        files.push(...(await listAllFiles(client, bucket, path)));
      } else {
        files.push(path);
      }
    }

    if (data.length < 100) break;
    offset += data.length;
  }

  return files;
}

async function ensureBucket(bucket) {
  const { data } = await newSupabase.storage.getBucket(bucket);
  if (data) return;

  const { error } = await newSupabase.storage.createBucket(bucket, {
    public: true,
  });

  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Unable to create bucket ${bucket}: ${error.message}`);
  }
}

const summary = [];

for (const bucket of buckets) {
  await ensureBucket(bucket);

  const files = await listAllFiles(oldSupabase, bucket);
  let copied = 0;
  let failed = 0;

  console.log(`\n${bucket}: ${files.length} file(s) found`);

  for (const path of files) {
    const { data, error: downloadError } = await oldSupabase.storage
      .from(bucket)
      .download(path);

    if (downloadError) {
      failed += 1;
      console.error(`  download failed: ${path} - ${downloadError.message}`);
      continue;
    }

    const { error: uploadError } = await newSupabase.storage
      .from(bucket)
      .upload(path, data, {
        upsert: true,
        contentType: data.type || "application/octet-stream",
      });

    if (uploadError) {
      failed += 1;
      console.error(`  upload failed: ${path} - ${uploadError.message}`);
      continue;
    }

    copied += 1;
    console.log(`  ok ${path}`);
  }

  summary.push({ bucket, found: files.length, copied, failed });
}

console.log("\nSummary");
for (const row of summary) {
  console.log(`${row.bucket}: found=${row.found}, copied=${row.copied}, failed=${row.failed}`);
}

if (summary.some((row) => row.failed > 0)) process.exit(1);
