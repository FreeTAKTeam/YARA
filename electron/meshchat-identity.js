const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function exists(file) {
    try {
        fs.lstatSync(file);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

function importMeshchatIdentity({ stateDir, homeDir, repoRoot, packaged, platform, env }) {
    const destination = path.join(stateDir, 'identity');
    if (exists(destination) || env.YARA_IMPORT_MESHCHAT === '0') return null;

    const explicit = env.YARA_MESHCHAT_IDENTITY;
    const candidates = explicit ? [path.resolve(explicit)] : [
        path.join(homeDir, '.reticulum-meshchat', 'identity'),
        ...(platform === 'win32' && env.PORTABLE_EXECUTABLE_DIR
            ? [path.join(env.PORTABLE_EXECUTABLE_DIR, '.reticulum-meshchat', 'identity')] : []),
        ...(!packaged ? [path.join(repoRoot, 'storage', 'identity')] : []),
    ];
    const sources = [...new Set(candidates)].filter(exists);
    if (!sources.length) {
        if (explicit) throw new Error(`MeshChat identity not found: ${explicit}`);
        return null;
    }
    // A missing key in an established profile is recovery, not a first-run import.
    if (exists(path.join(stateDir, 'reticulum.db'))) {
        throw new Error('YARA has a message database but no identity. Restore its original identity before starting.');
    }
    const keys = sources.map((source) => {
        const stat = fs.statSync(source);
        if (!stat.isFile() || stat.size !== 64) {
            throw new Error(`Invalid MeshChat identity: ${source}. Expected a 64-byte private identity file.`);
        }
        const key = fs.readFileSync(source);
        if (key.length !== 64) throw new Error(`MeshChat identity changed while reading: ${source}`);
        return key;
    });
    if (keys.some((key) => !key.equals(keys[0]))) {
        throw new Error(`Multiple MeshChat identities found. Set YARA_MESHCHAT_IDENTITY to the file to import:\n${sources.join('\n')}`);
    }

    const temporary = path.join(stateDir, `.meshchat-identity-${randomUUID()}.tmp`);
    try {
        const fd = fs.openSync(temporary, 'wx', 0o600);
        try {
            fs.writeFileSync(fd, keys[0]);
            fs.fsyncSync(fd);
        } finally {
            fs.closeSync(fd);
        }
        // A hard link publishes the complete key atomically without replacing an existing identity.
        fs.linkSync(temporary, destination);
    } finally {
        if (exists(temporary)) fs.unlinkSync(temporary);
    }
    return sources[0];
}

module.exports = { importMeshchatIdentity };
