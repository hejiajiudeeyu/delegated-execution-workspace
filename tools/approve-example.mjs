import { request } from "node:http";

const adminApiKey = process.env.PLATFORM_ADMIN_API_KEY || "sk_admin_local_dev";
const platformBaseUrl = process.env.PLATFORM_API_BASE_URL || "http://127.0.0.1:8080";
const sellerId = process.env.SELLER_ID || process.argv[2];
const subagentId = process.env.SUBAGENT_ID || "local.summary.v1";

if (!sellerId) {
  console.error("[approve-example] SELLER_ID or argv[2] is required");
  process.exit(1);
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = request(
      target,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminApiKey}`,
          "content-type": "application/json; charset=utf-8"
        }
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      }
    );
    req.on("error", reject);
    req.end(JSON.stringify(body));
  });
}

const sellerResponse = await postJson(`${platformBaseUrl}/v1/admin/sellers/${encodeURIComponent(sellerId)}/approve`, {
  reason: "fourth-repo integration approval"
});
const subagentResponse = await postJson(`${platformBaseUrl}/v1/admin/subagents/${encodeURIComponent(subagentId)}/approve`, {
  reason: "fourth-repo integration approval"
});

console.log(sellerResponse);
console.log(subagentResponse);
