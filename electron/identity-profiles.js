const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const registryName = 'identity-profiles.json';
const validId = id => id === 'default' || /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);

function readProfiles(root) {
    const file = path.join(root, registryName);
    if (!fs.existsSync(file)) return { version: 1, active: 'default', profiles: [{ id: 'default', backup: false }] };
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.version !== 1 || !Array.isArray(data.profiles) || !data.profiles.length ||
        data.profiles.some(p => !p || !validId(p.id) || typeof p.backup !== 'boolean') ||
        new Set(data.profiles.map(p => p.id)).size !== data.profiles.length ||
        !data.profiles.some(p => p.id === data.active) || !data.profiles.some(p => p.id === 'default')) {
        throw new Error('YARA identity profile list is invalid. Restore it from a backup before starting.');
    }
    return data;
}

function profileDir(root, id) {
    if (!validId(id)) throw new Error('Invalid identity profile.');
    return id === 'default' ? root : path.join(root, 'profiles', id);
}

function writeProfiles(root, data) {
    const target = path.join(root, registryName);
    const temp = path.join(root, `.${registryName}-${randomUUID()}.tmp`);
    try {
        fs.writeFileSync(temp, JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        fs.renameSync(temp, target);
    } finally {
        if (fs.existsSync(temp)) fs.unlinkSync(temp);
    }
}

function selectProfile(root, id) {
    const data = readProfiles(root);
    const key = path.join(profileDir(root, id), 'identity');
    const stat = fs.existsSync(key) && fs.statSync(key);
    if (!data.profiles.some(p => p.id === id) || !stat || !stat.isFile() || stat.size !== 64) {
        throw new Error('The selected identity profile is missing or invalid.');
    }
    data.active = id;
    writeProfiles(root, data);
}

function createProfile(root) {
    const id = randomUUID();
    const dir = profileDir(root, id);
    fs.mkdirSync(path.dirname(dir), { recursive: true, mode: 0o700 });
    fs.mkdirSync(dir, { mode: 0o700 });
    return { id, dir };
}

function activateNewProfile(root, id, replace) {
    const data = readProfiles(root);
    if (data.profiles.some(p => p.id === id) || !fs.existsSync(path.join(profileDir(root, id), 'identity'))) {
        throw new Error('The new identity profile is invalid.');
    }
    if (replace) data.profiles.find(p => p.id === data.active).backup = true;
    data.profiles.push({ id, backup: false });
    data.active = id;
    writeProfiles(root, data);
}

module.exports = { readProfiles, profileDir, selectProfile, createProfile, activateNewProfile };
