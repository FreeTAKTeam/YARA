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

function importMeshchatIdentity({ stateDir, source, expectedKey }) {
    const destination = path.join(stateDir, 'identity');
    const stat = fs.statSync(source);
    if (!stat.isFile() || stat.size !== 64) {
        throw new Error(`Invalid MeshChat identity: ${source}. Expected a 64-byte private identity file.`);
    }
    const key = fs.readFileSync(source);
    if (key.length !== 64) throw new Error(`MeshChat identity changed while reading: ${source}`);
    if (expectedKey && !key.equals(expectedKey)) throw new Error('The MeshChat identity changed after the import offer. Close MeshChat and try again.');
    if (exists(destination)) {
        if (!fs.readFileSync(destination).equals(key)) throw new Error('MeshChat identity does not match the existing YARA identity.');
        return null;
    }
    // A missing key in an established profile is recovery, not a first-run import.
    if (exists(path.join(stateDir, 'reticulum.db'))) {
        throw new Error('YARA has a message database but no identity. Restore its original identity before starting.');
    }
    const temporary = path.join(stateDir, `.meshchat-identity-${randomUUID()}.tmp`);
    try {
        const fd = fs.openSync(temporary, 'wx', 0o600);
        try {
            fs.writeFileSync(fd, key);
            fs.fsyncSync(fd);
        } finally {
            fs.closeSync(fd);
        }
        // A hard link publishes the complete key atomically without replacing an existing identity.
        fs.linkSync(temporary, destination);
    } finally {
        if (exists(temporary)) fs.unlinkSync(temporary);
    }
    return source;
}

module.exports = { importMeshchatIdentity };
