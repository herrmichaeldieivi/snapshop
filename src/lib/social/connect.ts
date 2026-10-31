import { getRepository } from "@/src/lib/repository";
import type { SocialCandidate, Store } from "@/src/lib/types";
import { metaMode, siteOrigin } from "@/src/lib/social/config";
import { decryptSecret, encryptSecret } from "@/src/lib/social/crypto";
import { SocialError } from "@/src/lib/social/errors";
import { mockCandidate } from "@/src/lib/social/mock";
import { buildAuthUrl, createOauthState, exchangeCode, fetchAccountCandidates, fetchFbUserId, fetchGrantedScopes, fetchPageAccess } from "@/src/lib/social/oauth";

const MOCK_SCOPES = ["instagram_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement", "pages_manage_posts"];

export function beginConnect(storeId: string, origin: string) {
  const mode = metaMode();
  if (mode === "unconfigured") {
    throw new SocialError("Meta isn't configured on this server. Set META_APP_ID and META_APP_SECRET (README → Instagram & Facebook sync).", 503);
  }
  const { state, nonce } = createOauthState(storeId);
  if (mode === "mock") return { url: `${origin}/api/meta/callback?code=mock&state=${encodeURIComponent(state)}`, nonce };
  return { url: buildAuthUrl(state, origin), nonce };
}

/** Auto-pick only when it's unambiguous: the Page whose IG username matches the store's handle, or the only Page. */
export function pickCandidate(candidates: SocialCandidate[], handle: string | null): SocialCandidate | null {
  const wanted = handle?.toLowerCase();
  if (wanted) {
    const matches = candidates.filter((candidate) => candidate.ig_username?.toLowerCase() === wanted);
    return matches.length === 1 ? (matches[0] as SocialCandidate) : null;
  }
  return candidates.length === 1 ? (candidates[0] as SocialCandidate) : null;
}

async function activate(store: Store, input: { fbUserId: string; scopes: string[]; candidate: SocialCandidate; pageToken: string; simulated: boolean }) {
  const repository = getRepository();
  await repository.saveSocialConnection(store.id, {
    status: "active",
    fb_user_id: input.fbUserId,
    page_id: input.candidate.page_id,
    page_name: input.candidate.page_name,
    ig_user_id: input.candidate.ig_user_id,
    ig_username: input.candidate.ig_username,
    access_token_enc: encryptSecret(input.pageToken),
    candidates: [],
    scopes: input.scopes,
    token_expires_at: null,
    simulated: input.simulated,
  });
  const username = input.candidate.ig_username;
  if (username && username.toLowerCase() !== (store.instagram_handle ?? "").toLowerCase()) {
    await repository.saveStore(store.id, { instagram_handle: username });
  }
}

export async function completeConnect(store: Store, code: string, origin: string) {
  if (metaMode() === "mock") {
    const candidate = mockCandidate(store.name, store.instagram_handle ?? "sample_shop");
    await activate(store, { fbUserId: "mock-user", scopes: MOCK_SCOPES, candidate, pageToken: "mock-token", simulated: true });
    return;
  }
  const { token, expiresAt } = await exchangeCode(code, origin);
  const [fbUserId, scopes, candidates] = await Promise.all([fetchFbUserId(token), fetchGrantedScopes(token), fetchAccountCandidates(token)]);
  if (!candidates.length) {
    throw new SocialError("Meta returned no Facebook Pages for this login. Importing and posting need an Instagram professional account linked to a Page you manage.", 400);
  }
  const picked = pickCandidate(candidates, store.instagram_handle);
  if (picked) {
    const access = await fetchPageAccess(token, picked.page_id);
    await activate(store, { fbUserId, scopes, candidate: picked, pageToken: access.token, simulated: false });
    return;
  }
  await getRepository().saveSocialConnection(store.id, {
    status: "pending",
    fb_user_id: fbUserId,
    page_id: null,
    page_name: null,
    ig_user_id: null,
    ig_username: null,
    access_token_enc: encryptSecret(token),
    candidates,
    scopes,
    token_expires_at: expiresAt,
    simulated: false,
  });
}

/** The person picked a Page/Instagram account from the list; trade the user token for that Page's token. */
export async function selectCandidate(store: Store, pageId: string) {
  const connection = await getRepository().getSocialConnection(store.id);
  if (!connection || connection.status !== "pending" || !connection.access_token_enc) {
    throw new SocialError("There's no pending connection to choose from. Start the connection again.", 409);
  }
  const candidate = connection.candidates.find((entry) => entry.page_id === pageId);
  if (!candidate) throw new SocialError("That account isn't in the list Meta returned.", 400);
  const pageToken = connection.simulated ? "mock-token" : (await fetchPageAccess(decryptSecret(connection.access_token_enc), pageId)).token;
  await activate(store, { fbUserId: connection.fb_user_id ?? "", scopes: connection.scopes, candidate, pageToken, simulated: connection.simulated });
}

export const originFor = (requestOrigin: string) => siteOrigin(requestOrigin) ?? requestOrigin;
