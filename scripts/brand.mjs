import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_BRAND = 'acme';

function abort(prefix, npmScript, lines) {
  for (const line of lines) console.error(`${prefix}: ${line}`);
  console.error(`${prefix}: usage: npm run ${npmScript} -- [targetDir] [--brand=<id>]`);
  console.error(`${prefix}: --brand defaults to ${DEFAULT_BRAND}`);
  process.exit(1);
}

/**
 * Splits --brand=<id> out of argv; positional arguments are returned untouched.
 *
 * Anything unrecognised aborts. Silently ignoring a bad flag and falling back
 * to the default brand produces a successful-looking run that builds the wrong
 * brand, which is far more expensive than a hard failure.
 */
export function parseBrandArg(argv, { prefix, npmScript }) {
  let brandId = null;
  const rest = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const inline = /^--brand=(.*)$/.exec(arg);

    if (inline) {
      if (!inline[1]) abort(prefix, npmScript, ['--brand= needs a brand id, e.g. --brand=acme']);
      brandId = inline[1];
    } else if (arg === '--brand') {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('-')) {
        abort(prefix, npmScript, ['--brand needs a brand id, e.g. --brand=acme']);
      }
      brandId = next;
      i += 1;
    } else if (arg.startsWith('-')) {
      abort(prefix, npmScript, [`unrecognised option "${arg}"`]);
    } else {
      rest.push(arg);
    }
  }

  if (rest.length > 1) {
    abort(prefix, npmScript, [`unexpected extra argument "${rest[1]}" (only one targetDir is accepted)`]);
  }

  // Without the `--` separator npm keeps --brand for itself and exports it as
  // npm_config_brand, so the script sees no argument at all.
  if (brandId === null && process.env.npm_config_brand) {
    abort(prefix, npmScript, [
      `--brand was consumed by npm and never reached ${prefix}`,
      `add the -- separator: npm run ${npmScript} -- --brand=${process.env.npm_config_brand}`,
    ]);
  }

  return { brandId: brandId ?? DEFAULT_BRAND, rest };
}

function listBrands(brandsRoot) {
  if (!existsSync(brandsRoot)) return [];
  return readdirSync(brandsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Resolves brands/<id>, failing with the path it looked for and what exists. */
export function resolveBrandDir(repoRoot, brandId, logPrefix) {
  const brandsRoot = join(repoRoot, 'brands');
  const brandDir = join(brandsRoot, brandId);

  if (!existsSync(brandDir) || !statSync(brandDir).isDirectory()) {
    const available = listBrands(brandsRoot);
    console.error(`${logPrefix}: no such brand "${brandId}" - looked for ${brandDir}`);
    console.error(`${logPrefix}: available brands: ${available.length ? available.join(', ') : '(none found)'}`);
    process.exit(1);
  }

  return brandDir;
}
