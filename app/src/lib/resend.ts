// Server-side Resend API helper.
// Never called from the browser — always from Server Actions or Route Handlers.

const RESEND_API = "https://api.resend.com";

export async function resendFetch(
  apiKey: string,
  method: string,
  path: string,
  body?: object
): Promise<Record<string, unknown>> {
  const res = await fetch(`${RESEND_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    throw new Error((json.message as string) ?? `Resend API error ${res.status}`);
  }
  return json;
}
