// Copyright 2025 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

const fs = require('node:fs');
const { execSync } = require('node:child_process');

const _ = require('lodash');
const {
  default: packageJson,
  version: currentVersion,
} = require('./packageJson.js');

const shortSha = execSync('git rev-parse --short=7 HEAD')
  .toString('utf8')
  .replace(/[\n\r]/g, '');

const buildDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');

const newVersion = `${currentVersion}-${buildDate}-${shortSha}`;

console.log(
  `prepare_build_metadata: updating package.json.\n  Previous: ${currentVersion}\n  New:      ${newVersion}`
);

_.set(packageJson, 'version', newVersion);

fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, '  '));
