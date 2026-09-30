import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const trackedEdgeFiles = execFileSync('git', ['ls-files', 'supabase/functions/**/*.ts'], { encoding: 'utf8' })
	.split('\n')
	.filter(Boolean);

const guardrails = [
	{
		name: 'unbounded request JSON parsing',
		pattern: /\bawait\s+req\.json\s*\(/,
		message: 'Use a bounded request-body reader so malformed or huge webhook payloads fail safely.'
	},
	{
		name: 'raw caught error logging',
		pattern: /console\.(?:error|warn|log)\([^;\n]*(?:,\s*(?:err|error|e))\s*\)/,
		message: 'Log a sanitized message or explicit safe fields instead of raw request/error objects.'
	},
	{
		name: 'strict single-row lookup',
		pattern: /\.single\s*\(\s*\)/,
		message: 'Use maybeSingle() plus explicit error handling for missing rows in user-facing sync paths.'
	}
];

const findings = [];

for (const file of trackedEdgeFiles) {
	const text = readFileSync(file, 'utf8');
	const lines = text.split(/\r?\n/);

	for (const { name, pattern, message } of guardrails) {
		lines.forEach((line, index) => {
			if (pattern.test(line)) {
				findings.push(`${file}:${index + 1} ${name} — ${message}`);
			}
		});
	}
}

if (findings.length > 0) {
	console.error('Edge function shippability guard failed:\n' + findings.join('\n'));
	process.exit(1);
}

console.log(`Edge function guardrails passed for ${trackedEdgeFiles.length} files.`);
