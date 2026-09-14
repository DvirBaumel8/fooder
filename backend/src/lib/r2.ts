import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`R2 is not configured: missing ${name}`);
  }
  return value;
}

function buildClient(accountId: string): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });
}

export async function uploadPhoto(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  // Read env vars lazily (rather than at module load time) so a missing/blank
  // value is caught here and turned into a clear error instead of silently
  // producing a broken URL like "undefined/products/<id>/<uuid>" that then
  // gets persisted permanently onto the Product with no way to fix it.
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const bucket = requireEnv("R2_BUCKET");
  const publicBaseUrl = requireEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
  requireEnv("R2_ACCESS_KEY_ID");
  requireEnv("R2_SECRET_ACCESS_KEY");

  const r2Client = buildClient(accountId);

  await r2Client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  );
  return `${publicBaseUrl}/${key}`;
}
