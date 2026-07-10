import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
	.split('\n')
	.filter(Boolean)
	.filter((file) => !file.endsWith('package-lock.json'));

const secretPatterns = [
	{ name: 'private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/ },
	{ name: 'Supabase secret key', pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}\b/ },
	{ name: 'Google OAuth client secret', pattern: /\bGOCSPX-[A-Za-z0-9_-]{12,}\b/ },
	{ name: 'Google API key', pattern: /\bAIzaSy[A-Za-z0-9_-]{20,}\b/ },
	{ name: 'OpenAI-style API key', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
	{ name: 'hardcoded database password', pattern: /\bSUPABASE_DB_PASSWORD\s*=\s*['"]?[^'"\s#]+/ },
];

const findings = [];

for (const file of trackedFiles) {
	const text = readFileSync(file, 'utf8');
	const lines = text.split(/\r?\n/);

	for (const { name, pattern } of secretPatterns) {
		lines.forEach((line, index) => {
			if (name === 'private key block' && (line.includes('.replace(') || line.includes('including '))) {
				return;
			}
			if (pattern.test(line)) {
				findings.push(`${file}:${index + 1} ${name}`);
			}
		});
	}
}

if (findings.length > 0) {
	console.error('Potential tracked secrets found:\n' + findings.join('\n'));
	process.exit(1);
}

console.log(`No tracked secrets found in ${trackedFiles.length} files.`);
