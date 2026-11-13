const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { importMeshchatIdentity } = require('./meshchat-identity');
const { readProfiles, createProfile, activateNewProfile } = require('./identity-profiles');

const execute = promisify(execFile);

function discoverMeshchat({ homeDir, repoRoot, packaged, platform, env, executablePath, desktopDir }) {
    const adjacent = [env.PORTABLE_EXECUTABLE_DIR,
        env.PORTABLE_EXECUTABLE_FILE && path.dirname(env.PORTABLE_EXECUTABLE_FILE),
        executablePath && path.dirname(executablePath),
        ...(platform === 'win32' ? [desktopDir || path.join(homeDir, 'Desktop')] : []),
    ].filter(Boolean);
    const roots = [...new Set([...adjacent, homeDir])];
    const profiles = roots.flatMap(root => [
        path.join(root, '.reticulum-meshchat'), path.join(root, 'storage'),
        path.join(root, '.reticulum'), path.join(root, '.reticulum', 'storage'),
    ]);
    if (!packaged) profiles.push(path.join(repoRoot, 'storage'));
    const sources = env.YARA_MESHCHAT_IDENTITY ? [path.resolve(env.YARA_MESHCHAT_IDENTITY)]
        : [...new Set(profiles.map(root => path.join(root, 'identity')))].filter(file => fs.existsSync(file));
    const configs = roots.map(root => path.join(root, '.reticulum', 'config')).filter(file => fs.existsSync(file));
    return { sources, configs };
}

async function runImporter(binary, args) {
    try {
        const { stdout } = await execute(binary, args, { windowsHide: true, maxBuffer: 1024 * 1024 });
        const value = JSON.parse(stdout);
        if (!/^[0-9a-f]{32}$/.test(value.identity_hash) || !/^[0-9a-f]{32}$/.test(value.lxmf_address_hash)
            || !Number.isSafeInteger(value.message_count) || value.message_count < 0
            || !(value.database_path === null || typeof value.database_path === 'string')) {
            throw new Error('Invalid MeshChat import summary');
        }
        if (args.includes('--db') && !['imported', 'skipped'].every(key => Number.isSafeInteger(value[key]) && value[key] >= 0)) {
            throw new Error('Invalid MeshChat import result');
        }
        return value;
    } catch (error) {
        throw new Error(error.stderr?.trim() || error.message);
    }
}

async function offerMeshchatImport(options) {
    const { stateDir, importer, dialog, headless, env, run = runImporter } = options;
    const profileRoot = options.profileRoot || stateDir;
    if (env.YARA_IMPORT_MESHCHAT === '0') return true;
    const explicit = env.YARA_MESHCHAT_IDENTITY;
    const marker = path.join(stateDir, 'meshchat-import.json');
    if (!explicit && fs.existsSync(marker)) {
        try {
            if (['declined', 'imported'].includes(JSON.parse(fs.readFileSync(marker, 'utf8')).status)) return true;
        } catch (error) {
            console.warn('The previous MeshChat import offer was interrupted; offering it again.');
        }
    }
    if (headless && !explicit) return true;
    const { sources, configs } = discoverMeshchat(options);
    if (!sources.length && !configs.length && fs.existsSync(path.join(stateDir, 'identity'))) return true;
    const candidates = [];
    const targetIdentity = path.join(stateDir, 'identity');
    const existing = fs.existsSync(targetIdentity) ? fs.readFileSync(targetIdentity) : null;
    for (const source of sources) {
        const key = fs.readFileSync(source);
        const summary = await run(importer, ['--source-identity', source]);
        if (!fs.readFileSync(source).equals(key)) throw new Error('The MeshChat identity changed during discovery. Close MeshChat and try again.');
        // A Reticulum transport key is not a MeshChat profile without its chat database.
        const protocolFolder = path.dirname(source).split(path.sep).includes('.reticulum');
        if (!explicit && protocolFolder && summary.database_path === null) continue;
        candidates.push({ source, summary, key });
    }
    let selected = headless ? candidates[0] : null;
    if (!headless) {
        const response = await dialog.showMessageBox({
            type: 'question', title: 'Import MeshChat profile',
            message: existing ? 'Choose an identity or import missing MeshChat messages' : 'Bring your identity and messages into YARA?',
            detail: `${candidates.map(({ source, summary }, index) => `${index + 1}. ${source}\n${summary.message_count} messages${summary.database_path === null ? ' (identity only; no message database found)' : ''}`).join('\n\n') || 'Choose the MeshChat storage folder that contains your identity.'}${configs.length ? `\n\nReticulum network configuration found:\n${configs.join('\n')}\nNetwork settings are not imported.` : ''}\n\nClose MeshChat first. Its files will stay unchanged. Imported history will not be resent.${existing ? '\nYour current YARA identity and messages will be kept.' : ''}`,
            buttons: [...candidates.map((_, index) => `Import profile ${index + 1}`), 'Choose folder…', 'Skip import', 'Cancel'],
            defaultId: candidates.length, cancelId: candidates.length + 2, noLink: true,
        });
        if (response.response === candidates.length + 2) return false;
        if (response.response === candidates.length + 1) {
            if (options.manual) return false;
            fs.writeFileSync(marker, JSON.stringify({ status: 'declined' }) + '\n', { mode: 0o600 });
            return true;
        }
        if (response.response < candidates.length) selected = candidates[response.response];
        else {
            const choice = await dialog.showOpenDialog({ title: 'Choose MeshChat storage folder', properties: ['openDirectory'] });
            if (choice.canceled || !choice.filePaths.length) return false;
            const folder = choice.filePaths[0];
            const possible = [folder, path.join(folder, '.reticulum-meshchat'), path.join(folder, 'storage'),
                path.join(folder, '.reticulum'), path.join(folder, '.reticulum', 'storage')];
            const found = possible.map(root => path.join(root, 'identity')).filter(file => fs.existsSync(file));
            if (found.length !== 1) throw new Error('Choose the specific MeshChat storage folder containing its identity file.');
            // Show the selected source and its count before any identity/history write.
            return offerMeshchatImport({ ...options, env: { ...env, YARA_MESHCHAT_IDENTITY: found[0] } });
        }
    }
    if (!selected) throw new Error('No MeshChat profile was selected.');
    let targetDir = stateDir;
    let newProfile;
    let replace = false;
    if (existing && (!selected.key.equals(existing) || options.forceNewProfile)) {
        if (headless) throw new Error('A different identity requires interactive confirmation.');
        const choice = await dialog.showMessageBox({
            type: 'warning', title: 'Different identity',
            message: 'How do you want to use this identity?',
            detail: 'A separate profile keeps each identity, messages and settings apart. Existing YARA messages are not copied into the new profile. Replacing the current profile makes the imported profile active and keeps the previous profile as a recoverable backup.',
            buttons: ['Cancel', 'Use as separate profile', 'Replace current profile…'],
            defaultId: 0, cancelId: 0, noLink: true,
        });
        if (choice.response !== 1 && choice.response !== 2) return false;
        replace = choice.response === 2;
        if (replace) {
            const warning = await dialog.showMessageBox({
                type: 'warning', title: 'Replace current profile?',
                message: 'Replace the active identity and its profile?',
                detail: 'Your address, messages and settings will change to the imported profile. The current profile will be kept as a backup and can be selected again. Close MeshChat before importing.',
                buttons: ['Cancel', 'Replace profile'], defaultId: 0, cancelId: 0, noLink: true,
            });
            if (warning.response !== 1) return false;
        }
        newProfile = createProfile(profileRoot);
        targetDir = newProfile.dir;
    }
    let summary;
    try {
        const targetKey = path.join(targetDir, 'identity');
        importMeshchatIdentity({ stateDir: targetDir, source: selected.source, expectedKey: selected.key });
        summary = await run(importer, ['--source-identity', selected.source,
            '--identity', targetKey, '--db', path.join(targetDir, 'reticulum.db')]);
        if (summary.identity_hash !== selected.summary.identity_hash || summary.database_path !== selected.summary.database_path) {
            throw new Error('The MeshChat profile changed during import. Please try again with MeshChat closed.');
        }
        fs.writeFileSync(path.join(targetDir, 'meshchat-import.json'), JSON.stringify({ status: 'imported', source: selected.source,
            imported: summary.imported, skipped: summary.skipped }) + '\n', { mode: 0o600 });
        if (newProfile) activateNewProfile(profileRoot, newProfile.id, replace);
    } catch (error) {
        if (newProfile) {
            let published = true;
            try { published = readProfiles(profileRoot).profiles.some(profile => profile.id === newProfile.id); } catch (_) {}
            if (!published) {
                try { fs.rmSync(newProfile.dir, { recursive: true, force: true }); }
                catch (cleanupError) { throw new Error(`${error.message}; failed to remove incomplete profile: ${cleanupError.message}`); }
            }
        }
        throw error;
    }
    const message = `Your identity is ready in YARA. Its LXMF address stays the same.\n${summary.imported} messages imported; ${summary.skipped} already present.${summary.database_path === null ? '\nNo MeshChat message database was found; only the identity was copied.' : ''}\n\nThe source files are unchanged.${newProfile ? '\nClose and reopen YARA if it is already running.' : ''}`;
    if (headless) console.log(message);
    else await dialog.showMessageBox({ type: 'info', title: 'MeshChat import complete', message });
    return true;
}

module.exports = { discoverMeshchat, offerMeshchatImport, runImporter };
