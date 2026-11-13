const fs = require('node:fs');
const path = require('node:path');
const { readProfiles, profileDir, selectProfile } = require('./identity-profiles');
const { offerMeshchatImport, runImporter } = require('./meshchat-import');

async function manageIdentities({ migration, importer, dialog, run = runImporter, offer = offerMeshchatImport }) {
    const root = migration.profileRoot;
    const registry = readProfiles(root);
    const labels = [];
    const errors = [];
    for (const [index, profile] of registry.profiles.entries()) {
        const identity = path.join(profileDir(root, profile.id), 'identity');
        let address;
        let inspectionError;
        try {
            address = (await run(importer, ['--source-identity', identity])).lxmf_address_hash;
        } catch (error) {
            address = 'unavailable';
            inspectionError = error;
        }
        errors.push(inspectionError);
        labels.push(`Profile ${index + 1}: ${address}${profile.id === registry.active ? ' (next launch)' : ''}${profile.backup ? ' (backup)' : ''}`);
    }
    const result = await dialog.showMessageBox({
        type: 'question', title: 'Manage identities',
        message: 'Select a profile or import an identity',
        detail: 'Each profile keeps its own messages and settings. Changes take effect after you close and reopen YARA.',
        buttons: [...labels, 'Import identity file…', 'Import MeshChat folder…', 'Close'],
        defaultId: labels.length + 2, cancelId: labels.length + 2, noLink: true,
    });
    const selected = result.response;
    if (selected < labels.length) {
        if (errors[selected]) throw new Error(`That profile could not be inspected: ${errors[selected].message}`);
        const id = registry.profiles[selected].id;
        if (id === registry.active) return;
        selectProfile(root, id);
    } else if (selected === labels.length || selected === labels.length + 1) {
        const folder = selected === labels.length + 1;
        const picked = await dialog.showOpenDialog({
            title: folder ? 'Choose MeshChat storage folder' : 'Choose Reticulum private identity file',
            properties: [folder ? 'openDirectory' : 'openFile'],
        });
        if (picked.canceled || !picked.filePaths.length) return;
        let source = picked.filePaths[0];
        if (folder) {
            const candidates = [source, path.join(source, '.reticulum-meshchat'), path.join(source, 'storage'),
                path.join(source, '.reticulum'), path.join(source, '.reticulum', 'storage')]
                .map(dir => path.join(dir, 'identity')).filter(file => fs.existsSync(file));
            if (candidates.length !== 1) throw new Error('Choose the specific MeshChat storage folder containing one identity file.');
            source = candidates[0];
        }
        const accepted = await offer({ ...migration, stateDir: profileDir(root, registry.active), importer, dialog,
            headless: false, forceNewProfile: true, manual: true,
            env: { ...migration.env, YARA_IMPORT_MESHCHAT: '1', YARA_MESHCHAT_IDENTITY: source } });
        if (!accepted) return;
    } else return;
    await dialog.showMessageBox({ type: 'info', title: 'Identity selected',
        message: 'Close and reopen YARA to use the selected identity.', buttons: ['OK'] });
}

module.exports = { manageIdentities };
