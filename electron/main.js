const { app, BrowserWindow, dialog, ipcMain, shell, systemPreferences } = require('electron');
const electronPrompt = require('electron-prompt');
const { spawn } = require('child_process');
const fs = require('fs');
const net = require('node:net');
const path = require('node:path');
const { prepareLaunch } = require('./rust-poc-launcher');
const { offerMeshchatImport } = require('./meshchat-import');
const { manageIdentities } = require('./identity-manager');
const { readProfiles, profileDir } = require('./identity-profiles');

// remember main window
var mainWindow = null;
var quitting = false;
var backendStopping = false;
var rustPlan = null;
var identityManagerOpen = false;

// remember child process for exe so we can kill it when app exits
var exeChildProcess = null;
const rustPoc = app.isPackaged || process.env.MESHCHAT_RUST_POC === '1';
const serverUrl = `http://${rustPoc ? (process.env.RUST_POC_BIND || '127.0.0.1:9337') : '127.0.0.1:9337'}`;

ipcMain.handle('server-url', () => serverUrl);
ipcMain.handle('manage-identities', async(event) => {
    if (!rustPoc || !rustPlan || quitting || identityManagerOpen || event.sender !== mainWindow?.webContents) return;
    identityManagerOpen = true;
    try {
        await manageIdentities({ migration: rustPlan.migration, importer: rustPlan.importer, dialog });
    } catch (error) {
        dialog.showErrorBox('Identity management failed', error.message);
    } finally {
        identityManagerOpen = false;
    }
});
function isPortAvailable(bind) {
    const [host, port] = bind.split(':');
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.listen(Number(port), host, () => server.close(() => resolve(true)));
    });
}

// a daemon from a just-closed window needs a few seconds to stop, so wait for it before giving up
async function assertPortAvailable(bind, waitMs = 10000) {
    const deadline = Date.now() + waitMs;
    while(!(await isPortAvailable(bind))){
        if(Date.now() >= deadline){
            throw new Error(`Port ${bind} is already in use. Close the other YARA instance or set RUST_POC_BIND.`);
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
}

// allow fetching app version via ipc
ipcMain.handle('app-version', () => {
    return app.getVersion();
});

// add support for showing an alert window via ipc
ipcMain.handle('alert', async(event, message) => {
    return await dialog.showMessageBox(mainWindow, {
        message: message,
    });
});

// add support for showing a confirm window via ipc
ipcMain.handle('confirm', async(event, message) => {

    // show confirm dialog
    const result = await dialog.showMessageBox(mainWindow, {
        type: "question",
        title: "Confirm",
        message: message,
        cancelId: 0, // esc key should press cancel button
        defaultId: 1, // enter key should press ok button
        buttons: [
            "Cancel", // 0
            "OK", // 1
        ],
    });

    // check if user clicked OK
    return result.response === 1;

});

// add support for showing a prompt window via ipc
ipcMain.handle('prompt', async(event, message) => {
    return await electronPrompt({
        title: message,
        label: '',
        value: '',
        type: 'input',
        inputAttrs: {
            type: 'text',
        },
    });
});

// allow relaunching app via ipc
ipcMain.handle('relaunch', () => {
    if(quitting) return;
    app.relaunch();
    app.quit();
});

// allow showing a file path in os file manager
ipcMain.handle('showPathInFolder', (event, path) => {
    shell.showItemInFolder(path);
});

function log(message) {

    // log to stdout of this process
    console.log(message);

    // make sure main window exists
    if(!mainWindow){
        return;
    }

    // make sure window is not destroyed
    if(mainWindow.isDestroyed()){
        return;
    }

    // log to web console
    mainWindow.webContents.send('log', message);

}

function getDefaultStorageDir() {

    // if we are running a windows portable exe, we want to use .reticulum-meshchat in the portable exe dir
    // e.g if we launch "E:\Some\Path\MeshChat.exe" we want to use "E:\Some\Path\.reticulum-meshchat"
    const portableExecutableDir = process.env.PORTABLE_EXECUTABLE_DIR;
    if(process.platform === "win32" && portableExecutableDir != null){
        return path.join(portableExecutableDir, '.reticulum-meshchat');
    }

    // otherwise, we will fall back to putting the storage dir in the users home directory
    // e.g: ~/.reticulum-meshchat
    return path.join(app.getPath('home'), '.reticulum-meshchat');

}

function getDefaultReticulumConfigDir() {

    // if we are running a windows portable exe, we want to use .reticulum in the portable exe dir
    // e.g if we launch "E:\Some\Path\MeshChat.exe" we want to use "E:\Some\Path\.reticulum"
    const portableExecutableDir = process.env.PORTABLE_EXECUTABLE_DIR;
    if(process.platform === "win32" && portableExecutableDir != null){
        return path.join(portableExecutableDir, '.reticulum');
    }

    // otherwise, we will fall back to using the .reticulum folder in the users home directory
    // e.g: ~/.reticulum
    return path.join(app.getPath('home'), '.reticulum');

}

app.whenReady().then(async () => {

    // get arguments passed to application, and remove the provided application path
    const ignoredArguments = ["--no-sandbox", "--ozone-platform-hint=auto"];
    const userProvidedArguments = process.argv.slice(1).filter((arg) => !ignoredArguments.includes(arg));
    const shouldLaunchHeadless = userProvidedArguments.includes("--headless");
    if(rustPoc){
        try {
            rustPlan = prepareLaunch({
                packaged: app.isPackaged,
                resourcesPath: process.resourcesPath,
                executablePath: app.getPath('exe'),
                desktopDir: app.getPath('desktop'),
            });
            await assertPortAvailable(rustPlan.bind);
            if (!await offerMeshchatImport({ ...rustPlan.migration, importer: rustPlan.importer,
                dialog, headless: shouldLaunchHeadless })) {
                app.quit();
                return;
            }
            if (rustPlan.migration?.profileRoot && profileDir(rustPlan.migration.profileRoot,
                readProfiles(rustPlan.migration.profileRoot).active) !== rustPlan.stateDir) {
                rustPlan = prepareLaunch({
                    packaged: app.isPackaged,
                    resourcesPath: process.resourcesPath,
                    executablePath: app.getPath('exe'),
                    desktopDir: app.getPath('desktop'),
                });
            }
        } catch(error) {
            dialog.showErrorBox('YARA startup failed', error.message);
            app.quit();
            return;
        }
    }

    if(quitting) return;

    if(!shouldLaunchHeadless){

        // create browser window
        mainWindow = new BrowserWindow({
            width: 1500,
            height: 800,
            icon: path.join(__dirname, 'build', 'icon.png'),
            backgroundColor: '#020710',
            // macOS needs its native title bar to keep traffic lights outside the app content.
            // Elsewhere the YARA top bar hosts the window controls; Alt still shows the menu.
            autoHideMenuBar: true,
            titleBarStyle: process.platform === 'darwin' ? 'default' : 'hidden',
            titleBarOverlay: process.platform === 'darwin' ? false : {
                color: '#00000000',
                symbolColor: '#8fdbff',
                height: 86,
            },
            webPreferences: {
                // used to inject logging over ipc
                preload: path.join(__dirname, 'preload.js'),
            },
        });

        // open external links in default web browser instead of electron
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {

            var shouldShowInNewElectronWindow = false;

            // we want to open call.html in a new electron window
            // but all other target="_blank" links should open in the system web browser
            // we don't want /rnode-flasher/index.html to open in electron, otherwise user can't select usb devices...
            if(url.startsWith("http://localhost") && url.includes("/call.html")){
                shouldShowInNewElectronWindow = true;
            }

            // we want to open blob urls in a new electron window
            else if(url.startsWith("blob:")) {
                shouldShowInNewElectronWindow = true;
            }

            // open in new electron window
            if(shouldShowInNewElectronWindow){
                return {
                    action: "allow",
                };
            }

            // fallback to opening any other url in external browser
            shell.openExternal(url);
            return {
                action: "deny",
            };

        });

        // navigate to loading page
        await mainWindow.loadFile(path.join(__dirname, 'loading.html'));

        // ask mac users for microphone access for audio calls to work
        if(process.platform === "darwin" && !rustPoc){
            await systemPreferences.askForMediaAccess('microphone');
        }

    }

    if(quitting) return;

    try {
        if(rustPoc){
            exeChildProcess = spawn(rustPlan.binary, rustPlan.args, { windowsHide: true });
        } else {
            // find path to python/cxfreeze reticulum meshchat executable
            const exeName = process.platform === "win32" ? "ReticulumMeshChat.exe" : "ReticulumMeshChat";
            var exe = path.join(__dirname, `build/exe/${exeName}`);

            // if dist exe doesn't exist, check local build
            if(!fs.existsSync(exe)){
                exe = path.join(__dirname, '..', `build/exe/${exeName}`);
            }

            const requiredArguments = ['--headless', '--port', '9337'];
            if(!userProvidedArguments.includes("--reticulum-config-dir")){
                requiredArguments.push("--reticulum-config-dir", getDefaultReticulumConfigDir());
            }
            if(!userProvidedArguments.includes("--storage-dir")){
                requiredArguments.push("--storage-dir", getDefaultStorageDir());
            }
            exeChildProcess = spawn(exe, [...requiredArguments, ...userProvidedArguments]);
        }

        // log stdout
        var stdoutLines = [];
        exeChildProcess.stdout.setEncoding('utf8');
        exeChildProcess.stdout.on('data', function(data) {

            // log
            log(data.toString());

            // keep track of last 10 stdout lines
            stdoutLines.push(data.toString());
            if(stdoutLines.length > 10){
                stdoutLines.shift();
            }

        });

        // log stderr
        var stderrLines = [];
        exeChildProcess.stderr.setEncoding('utf8');
        exeChildProcess.stderr.on('data', function(data) {

            // log
            log(data.toString());

            // keep track of last 10 stderr lines
            stderrLines.push(data.toString());
            if(stderrLines.length > 10){
                stderrLines.shift();
            }

        });

        // log errors
        exeChildProcess.on('error', function(error) {
            log(error);
            dialog.showErrorBox('YARA startup failed', error.message);
            app.quit();
        });

        // quit electron app if exe dies
        exeChildProcess.on('exit', async function(code, signal) {
            if(quitting){
                return;
            }

            // tell user that Visual C++ redistributable needs to be installed on Windows
            if(code === 3221225781 && process.platform === "win32"){
                await dialog.showMessageBox(mainWindow, {
                    message: "Microsoft Visual C++ redistributable must be installed to run this application.",
                });
                app.quit();
                return;
            }

            // show crash log
            const stdout = stdoutLines.join("");
            const stderr = stderrLines.join("");
            await dialog.showMessageBox(mainWindow, {
                message: [
                    "YARA backend stopped",
                    "",
                    `Exit: ${code ?? signal}`,
                    "",
                    `----- stdout -----`,
                    "",
                    stdout,
                    `----- stderr -----`,
                    "",
                    stderr,
                ].join("\n"),
            });

            // quit after dismissing error dialog
            app.quit();

        });

    } catch(e) {
        log(e);
        dialog.showErrorBox('YARA startup failed', e.message);
        app.quit();
    }

});

app.on('before-quit', (event) => {
    quitting = true;
    const child = exeChildProcess;
    if(!child?.pid || child.exitCode !== null || child.signalCode !== null) return;

    // Keep Electron alive until the daemon releases its database and listening sockets.
    event.preventDefault();
    if(backendStopping) return;
    backendStopping = true;
    const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
    child.once('exit', () => {
        clearTimeout(timeout);
        exeChildProcess = null;
        app.quit();
    });
    child.kill(rustPoc ? 'SIGTERM' : 'SIGKILL');
});

app.on('window-all-closed', () => {
    app.quit();
});

// quit through before-quit when the app is signalled (logout, kill, Ctrl+C), so the daemon is not orphaned
for(const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']){
    process.on(signal, () => app.quit());
}
