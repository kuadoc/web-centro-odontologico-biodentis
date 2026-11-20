import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { S3StorageDriver } from "@/modules/storage/drivers/s3.driver";
import { DomainError, InfrastructureError, NotFoundError } from "@/lib/errors";

test("S3: configuración, operaciones, inmutabilidad, privacidad y errores sin filtrar secretos", async (context) => {
  const env = {
    S3_ENDPOINT: "https://example.storage.supabase.co/storage/v1/s3", S3_REGION: "us-east-1",
    S3_BUCKET: "biodentis.drive", S3_IMAGE_PREFIX: "imagen", S3_ACCESS_KEY_ID: "test-access", S3_SECRET_ACCESS_KEY: "test-secret",
  };
  const previous = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  context.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const bytes = new Uint8Array([82, 73, 70, 70]);
  let failure: number | undefined;
  const commands: (PutObjectCommand | GetObjectCommand | DeleteObjectCommand)[] = [];
  context.mock.method(S3Client.prototype, "send", async function (this: S3Client, command: PutObjectCommand | GetObjectCommand | DeleteObjectCommand) {
    assert.equal(this.config.forcePathStyle, true);
    assert.equal(await this.config.region(), env.S3_REGION);
    assert.equal((await this.config.endpoint!()).path, "/storage/v1/s3");
    commands.push(command);
    if (failure) throw Object.assign(new Error("secret internal provider response"), { $metadata: { httpStatusCode: failure } });
    if (command instanceof GetObjectCommand) return { Body: { transformToByteArray: async () => bytes } };
    return {};
  });
  const driver = new S3StorageDriver();
  const key = `odontologos/${randomUUID()}.webp`;
  await driver.guardar(key, bytes);
  const put = commands[0] as PutObjectCommand;
  assert.equal(put.input.Bucket, env.S3_BUCKET);
  assert.equal(put.input.Key, `imagen/${key}`);
  assert.equal(put.input.IfNoneMatch, "*");
  assert.equal(put.input.ContentType, "image/webp");
  assert.deepEqual(await driver.leer(key), bytes);
  assert.equal(commands.at(-1)!.input.Key, `imagen/${key}`);
  await driver.guardar(`avatares/${randomUUID()}/${randomUUID()}.webp`, bytes);
  assert.equal((commands.at(-1) as PutObjectCommand).input.CacheControl, "private, no-store");
  failure = 412;
  await assert.rejects(driver.guardar(key, bytes), DomainError);
  failure = 404;
  await assert.rejects(driver.leer(key), NotFoundError);
  await driver.eliminar(key);
  assert.equal(commands.at(-1)!.input.Key, `imagen/${key}`);
  failure = 403;
  await assert.rejects(driver.leer(key), (error: unknown) => error instanceof InfrastructureError && !error.message.includes("secret"));
  await assert.rejects(driver.eliminar(key), InfrastructureError);
  const count = commands.length;
  await assert.rejects(driver.leer("../secret.webp"));
  await assert.rejects(driver.guardar(key, new Uint8Array(5 * 1024 * 1024 + 1)));
  assert.equal(commands.length, count);
  process.env.S3_IMAGE_PREFIX = "../documentos";
  await assert.rejects(new S3StorageDriver().leer(key), InfrastructureError);
  process.env.S3_IMAGE_PREFIX = "imagen";
  delete process.env.S3_BUCKET;
  await assert.rejects(new S3StorageDriver().leer(key), InfrastructureError);
});
