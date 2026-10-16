import { UTApi } from "uploadthing/server";
import { config } from "dotenv";
config({ path: ".env.local" });
config();

async function test() {
  const utapi = new UTApi();
  const file = new File(["test document content"], "test.txt", { type: "text/plain" });
  console.log("Uploading test file...");
  const res = await utapi.uploadFiles(file);
  console.log("Upload result:", JSON.stringify(res, null, 2));
}

test().catch(console.error);
