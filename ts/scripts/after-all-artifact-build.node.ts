// Copyright 2022 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import type { BuildResult } from 'electron-builder';

export async function afterAllArtifactBuild(
  _result: BuildResult
): Promise<Array<string>> {
  return [];
}
