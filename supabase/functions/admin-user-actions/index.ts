import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Server configuration missing" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return jsonResponse({ error: "Missing authorization token" }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(token);
    if (callerErr || !callerData?.user) {
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }

    const callerId = callerData.user.id;
    const { data: callerProfile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", callerId)
      .single();

    if (profErr || !callerProfile || callerProfile.role !== "admin") {
      return jsonResponse({ error: "Nur Admins dürfen diese Aktion ausführen." }, 403);
    }

    const payload = await req.json();
    const action = payload?.action as string | undefined;
    const targetUserId = payload?.targetUserId as string | undefined;

    if (!action || !targetUserId) {
      return jsonResponse({ error: "action und targetUserId sind erforderlich." }, 400);
    }

    if (action === "reset-password") {
      const newPassword = typeof payload?.newPassword === "string" ? payload.newPassword : "";
      if (newPassword.length < 6) {
        return jsonResponse({ error: "Das neue Passwort muss mindestens 6 Zeichen lang sein." }, 400);
      }

      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        password: newPassword
      });
      if (updErr) {
        return jsonResponse({ error: updErr.message }, 400);
      }
      return jsonResponse({ ok: true, action });
    }

    if (action === "toggle-role") {
      const nextRole = payload?.role;
      if (nextRole !== "admin" && nextRole !== "member") {
        return jsonResponse({ error: "Ungültige Rolle." }, 400);
      }
      if (targetUserId === callerId && nextRole !== "admin") {
        return jsonResponse({ error: "Du kannst dir nicht selbst die Admin-Rechte entziehen." }, 400);
      }

      const { error: roleErr } = await supabaseAdmin
        .from("profiles")
        .update({ role: nextRole, updated_at: new Date().toISOString() })
        .eq("id", targetUserId);

      if (roleErr) {
        return jsonResponse({ error: roleErr.message }, 400);
      }
      return jsonResponse({ ok: true, action, role: nextRole });
    }

    if (action === "delete-user") {
      if (targetUserId === callerId) {
        return jsonResponse({ error: "Du kannst deinen eigenen Account hier nicht löschen." }, 400);
      }

      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (delErr) {
        return jsonResponse({ error: delErr.message }, 400);
      }
      return jsonResponse({ ok: true, action });
    }

    return jsonResponse({ error: `Unbekannte Aktion: ${action}` }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Serverfehler";
    return jsonResponse({ error: message }, 500);
  }
});
