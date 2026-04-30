import { spawn as nodeSpawn } from 'child_process';
import type { SpawnOptionsWithoutStdio } from 'child_process';

export const PYTHON = '/usr/bin/python3';

// Include the user's local site-packages so packages installed with
// pip3 (without sudo) are visible even when the server runs as root.
const USER_SITE = '/home/eletricca/.local/lib/python3.12/site-packages';

export const PYTHON_ENV: NodeJS.ProcessEnv = {
    ...process.env,
    PYTHONPATH: process.env.PYTHONPATH
        ? `${USER_SITE}:${process.env.PYTHONPATH}`
        : USER_SITE,
};

export function spawnPython(args: string[], options?: SpawnOptionsWithoutStdio) {
    return nodeSpawn(PYTHON, args, { ...options, env: PYTHON_ENV });
}
