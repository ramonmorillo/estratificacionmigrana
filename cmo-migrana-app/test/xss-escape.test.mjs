// Regresión de seguridad: los datos tecleados, pegados o importados se escapan antes de insertarse como HTML.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('la modificación profesional y el identificador de caso se escapan', () => {
  const src = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.ok(src.includes('esc(override.justification)') && src.includes('esc(override.from)') && src.includes('esc(c.id)'));
  assert.doesNotMatch(src, /\$\{override\.justification\}/);
});
