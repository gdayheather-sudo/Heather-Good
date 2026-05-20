import { Resend } from "resend";
import { marked } from "marked";

let cached: Resend | null = null;

function getResend(): Resend {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  cached = new Resend(apiKey);
  return cached;
}

const FROM = process.env.RESEND_FROM || "The Clarity Hub <hello@clarityhub.com.au>";

// Brand tokens (inline styles — email clients ignore <style> + classes).
const C = {
  warmWhite: "#F7F4EF",
  charcoal: "#2E2E2E",
  navy: "#3F5366",
  sage: "#8FA79A",
  clay: "#C97E63",
  paper: "#FBF9F5",
  muted: "#6B6B6B",
};

function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

// Wraps rendered markdown in a branded, email-safe HTML shell.
function shell(opts: {
  preheader: string;
  wordmark: string;
  badge: string;
  bodyHtml: string;
  footerHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { margin:0; padding:0; background:${C.warmWhite}; }
  .doc h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 28px; line-height:1.2; color:${C.charcoal}; margin:0 0 8px; }
  .doc h2 { font-family: Georgia, 'Times New Roman', serif; font-size: 20px; line-height:1.3; color:${C.navy}; margin:32px 0 12px; }
  .doc h3 { font-size: 16px; color:${C.charcoal}; margin:24px 0 8px; }
  .doc p { font-size:15px; line-height:1.65; color:${C.charcoal}; margin:0 0 14px; }
  .doc em { color:${C.clay}; }
  .doc ul, .doc ol { margin:0 0 16px; padding-left:22px; }
  .doc li { font-size:15px; line-height:1.6; color:${C.charcoal}; margin:0 0 6px; }
  .doc table { width:100%; border-collapse:collapse; margin:0 0 20px; font-size:14px; }
  .doc th { text-align:left; background:${C.paper}; color:${C.navy}; padding:10px 12px; border:1px solid #E3DED4; }
  .doc td { padding:10px 12px; border:1px solid #E3DED4; color:${C.charcoal}; vertical-align:top; }
  .doc blockquote { border-left:2px solid ${C.clay}; margin:0 0 16px; padding:4px 0 4px 16px; color:${C.navy}; font-style:italic; }
  .doc hr { border:none; border-top:1px solid #E3DED4; margin:28px 0; }
</style>
</head>
<body>
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.warmWhite};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:${C.paper};border:1px solid #ECE6DA;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:32px 40px 0;">
        <div style="font-family:Georgia,serif;font-size:20px;color:${C.charcoal};">${opts.wordmark}</div>
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${C.navy};margin-top:6px;">${opts.badge}</div>
        <div style="height:1px;background:linear-gradient(to right,transparent,#D9D2C4,transparent);margin:24px 0 8px;"></div>
      </td></tr>
      <tr><td class="doc" style="padding:8px 40px 8px;font-family:Helvetica,Arial,sans-serif;">
        ${opts.bodyHtml}
      </td></tr>
      <tr><td style="padding:24px 40px 36px;">
        <div style="height:1px;background:#E3DED4;margin:0 0 20px;"></div>
        <div style="font-size:12px;line-height:1.6;color:${C.muted};letter-spacing:0.03em;">${opts.footerHtml}</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export async function sendClientSummary(opts: {
  to: string;
  clientName: string;
  summaryMarkdown: string;
}): Promise<void> {
  const bodyHtml = renderMarkdown(opts.summaryMarkdown);
  const html = shell({
    preheader: "Your pre-audit summary is ready.",
    wordmark: "The <em style='color:" + C.clay + ";'>Clarity</em> Hub",
    badge: "Pre-Audit Summary",
    bodyHtml,
    footerHtml: "Heather Good · The Clarity Hub · hello@clarityhub.com.au",
  });

  await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: "Your pre-audit summary — see you on the call ✨",
    html,
  });
}

export async function sendInternalPrep(opts: {
  clientName: string;
  callDate: string;
  prepMarkdown: string;
  clientSummaryMarkdown: string;
  adminUrl?: string;
}): Promise<void> {
  const heatherEmail = process.env.HEATHER_EMAIL;
  if (!heatherEmail) throw new Error("Missing HEATHER_EMAIL");

  const prepHtml = renderMarkdown(opts.prepMarkdown);
  const summaryHtml = renderMarkdown(opts.clientSummaryMarkdown);
  const adminUrl = opts.adminUrl || process.env.SUPABASE_ADMIN_URL;

  const bodyHtml = `
    ${prepHtml}
    <hr />
    <h2 style="color:${C.navy};">— For reference: what the client received —</h2>
    ${summaryHtml}
  `;

  const footerHtml = adminUrl
    ? `<a href="${adminUrl}" style="color:${C.navy};">View this audit in Supabase admin</a>`
    : "The Clarity Hub · internal";

  const html = shell({
    preheader: `Audit prep ready for ${opts.clientName}.`,
    wordmark: "The <em style='color:" + C.clay + ";'>Clarity</em> Hub",
    badge: "Internal · Audit Prep",
    bodyHtml,
    footerHtml,
  });

  await getResend().emails.send({
    from: FROM,
    to: heatherEmail,
    subject: `🎯 Audit prep ready — ${opts.clientName} · ${opts.callDate}`,
    html,
  });
}
