import { adminClient } from '$lib/server/auth';

const RESERVED_BLOCK_DOMAINS = new Set(['noteresin.com', 'resin.com', 'supabase.co']);
const MAX_RETURNED_BLOCKED_DOMAINS = 1000;

export function normalizeBlockedDomain(raw: unknown): string | null {
	if (typeof raw !== 'string') return null;
	let domain = raw.trim().toLowerCase();
	domain = domain.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
	domain = domain.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
	domain = domain.replace(/^www\./, '');
	if (!/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain)) return null;
	if ([...RESERVED_BLOCK_DOMAINS].some((reserved) => domain === reserved || domain.endsWith(`.${reserved}`))) {
		return null;
	}
	return domain;
}

export async function getUserBlockedDomains(userId: string): Promise<string[]> {
	const [{ data: customBlocks, error: customError }, { data: profile, error: profileError }] = await Promise.all([
		adminClient
			.from('user_custom_blocks')
			.select('domain')
			.eq('user_id', userId)
			.order('domain', { ascending: true })
			.limit(MAX_RETURNED_BLOCKED_DOMAINS),
		adminClient.from('profiles').select('blocked_domains').eq('id', userId).maybeSingle()
	]);

	if (customError && profileError) {
		console.error('[blocking-domains] blocked domain lookup failed');
		return [];
	}

	const domains = [
		...(customBlocks ?? []).map((block) => block.domain),
		...((profile?.blocked_domains as string[] | null | undefined) ?? [])
	];

	return Array.from(
		new Set(domains.map(normalizeBlockedDomain).filter((domain): domain is string => Boolean(domain)))
	).sort().slice(0, MAX_RETURNED_BLOCKED_DOMAINS);
}
