import { request } from "node:http";

const adminApiKey = process.env.PLATFORM_ADMIN_API_KEY || "sk_admin_local_dev";
const platformBaseUrl = process.env.PLATFORM_API_BASE_URL || "http://127.0.0.1:8080";
const responderId = process.env.RESPONDER_ID || process.argv[2];
const hotlineId = process.env.HOTLINE_ID || "local.summary.v1";

if (!responderId) {
  console.error("[approve-example] RESPONDER_ID or argv[2] is required");
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

const responderResponse = await postJson(`${platformBaseUrl}/v2/admin/responders/${encodeURIComponent(responderId)}/approve`, {
  reason: "fourth-repo integration approval"
});
const hotlineResponse = await postJson(`${platformBaseUrl}/v2/admin/hotlines/${encodeURIComponent(hotlineId)}/approve`, {
  reason: "fourth-repo integration approval"
});

console.log(responderResponse);
console.log(hotlineResponse);
