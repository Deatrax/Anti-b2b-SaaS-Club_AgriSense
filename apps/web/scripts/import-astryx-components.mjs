#!/usr/bin/env node
// Reads Docs/inventory_import.md, derives the real `astryx swizzle` target for each
// listed component, and swizzles them one by one. Re-run any time the inventory file
// changes — already-swizzled components are simply overwritten with -f (idempotent).
//
// Display names in the source file don't always match the CLI's swizzle target name
// (e.g. "Side Nav Heading"/"Side Nav Item"/"Side Nav Section" all live in the SideNav
// module; "H Stack"/"V Stack" both live in Stack; every "Chat *" component lives in
// Chat). This map is the same one used for the original inventory swizzle pass —
// see Docs/AgriSense_Astryx_Inventory.md.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const inventoryPath = path.join(repoRoot, 'Docs/inventory_import.md');
const webRoot = path.resolve(__dirname, '..');

const IRREGULAR_TARGETS = {
  'List Item': 'List',
  'Layout Panel': 'Layout',
  'Layout Content': 'Layout',
  'Side Nav': 'SideNav',
  'Side Nav Heading': 'SideNav',
  'Side Nav Item': 'SideNav',
  'Side Nav Section': 'SideNav',
  'H Stack': 'Stack',
  'V Stack': 'Stack',
  'Chat Layout': 'Chat',
  'Chat Message List': 'Chat',
  'Chat Message': 'Chat',
  'Chat Message Bubble': 'Chat',
  'Chat Message Metadata': 'Chat',
  'Chat Tool Calls': 'Chat',
  'Chat Composer': 'Chat',
  'Chat Composer Input': 'Chat',
  'Chat Send Button': 'Chat',
  'Toggle Button Group': 'ToggleButton',
  'PopOver': 'Popover',
  'App Shell': 'AppShell',
  'Meta Data List': 'MetadataList',
  'Number Input': 'NumberInput',
  'Progress Bar': 'ProgressBar',
  'Alert Dialog': 'AlertDialog',
  'Form Layout': 'FormLayout',
  'Text Input': 'TextInput',
  'Empty State': 'EmptyState',
  'Tab List': 'TabList',
  'Tab': 'TabList',
};

function toTarget(displayName) {
  const trimmed = displayName.trim();
  if (IRREGULAR_TARGETS[trimmed]) return IRREGULAR_TARGETS[trimmed];
  // Regular case: strip spaces ("Status Dot" -> "StatusDot").
  return trimmed.replace(/\s+/g, '');
}

const source = readFileSync(inventoryPath, 'utf8');
const displayNames = [...source.matchAll(/^\*\*(.+?)\*\*\s*$/gm)].map((m) => m[1]);

if (displayNames.length === 0) {
  console.error(`No **Component Name** headers found in ${inventoryPath}`);
  process.exit(1);
}

const targets = [...new Set(displayNames.map(toTarget))].sort();

console.log(`Found ${displayNames.length} component entries -> ${targets.length} unique swizzle targets.\n`);

const results = { ok: [], failed: [] };

for (const [i, target] of targets.entries()) {
  process.stdout.write(`[${i + 1}/${targets.length}] astryx swizzle ${target} ... `);
  try {
    execFileSync(
      'npx',
      ['astryx', 'swizzle', target, '-f'],
      { cwd: webRoot, stdio: 'pipe' },
    );
    console.log('ok');
    results.ok.push(target);
  } catch (err) {
    console.log('FAILED');
    console.error(err.stdout?.toString() ?? err.message);
    results.failed.push(target);
  }
}

console.log(`\nDone: ${results.ok.length} ok, ${results.failed.length} failed.`);
if (results.failed.length > 0) {
  console.error('Failed targets:', results.failed.join(', '));
  process.exit(1);
}
