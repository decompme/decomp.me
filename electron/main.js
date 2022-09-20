const { app, BrowserWindow, nativeTheme } = require("electron")
const childProcess = require("child_process")
const path = require("path")
const findFreePort = require("find-free-port")

const DEBUG = process.env.NODE_ENV == "development"
const BACKEND_DIR = path.join(__dirname, "..", "backend")
const FRONTEND_DIR = path.join(__dirname, "..", "frontend")
const DIST_DIR = path.join(__dirname, "dist")
const HOST = "127.0.0.1"

const env = (backendPort, frontendPort) => {
    return {
        DEBUG: DEBUG.toString(),
        SECRET_KEY: "django-insecure-nm#!8%z$hc0wwi#m_*l9l)=m*6gs4&o_^-e5b5vj*k05&yaqc1",
        DATABASE_URL: "sqlite:///dev.db",
        USE_SANDBOX_JAIL: "off",
        NEXT_PUBLIC_IS_ELECTRON: "true",
        FRONTEND_BASE: `http://${HOST}:${frontendPort}`,
        API_BASE: `http://${HOST}:${backendPort}/api`,
        INTERNAL_API_BASE: `http://${HOST}:${backendPort}/api`,
        API_BASE: `http://${HOST}:${backendPort}/api`,
    }
}

const promisifyChildProcess = childProcess => {
    return new Promise((resolve, reject) => {
        childProcess.on("error", reject)
        childProcess.on("exit", code => {
            if (code === 0) {
                resolve()
            } else {
                reject(new Error(`Process exited with code ${code}`))
            }
        })
    })
}

const createWindow = port => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 400,
        minHeight: 400,
        title: "decomp.me",
        backgroundColor: nativeTheme.shouldUseDarkColors ? "#1c2123" : "#dfdfdf",
        webPreferences: {
            sandbox: true,
            scrollBounce: true,
        }
    })

    win.once("ready-to-show", () => {
        win.show()
    })

    win.loadURL(`http://${HOST}:${port}`)
}

const startBackend = async (backendPort, frontendPort) => {
    const manage = (...args) => {
        if (DEBUG) {
            return childProcess.spawn("poetry", ["run", "python3", "manage.py", ...args], {
                cwd: BACKEND_DIR,
                stdio: "pipe",
                env: env(backendPort, frontendPort),
            })
        } else {
            return childProcess.spawn(path.join(DIST_DIR, "backend", "manage"), args, {
                cwd: BACKEND_DIR,
                stdio: "inherit", // "pipe",
                env: env(backendPort, frontendPort),
            })
        }
    }

    await promisifyChildProcess(manage("migrate"))

    const server = manage("runserver", `${HOST}:${backendPort}`)
    return new Promise((resolve, reject) => {
        server.on("error", reject)
        server.stdout.on("data", data => {
            data = data.toString("utf8")
            console.log("[backend]", data.trim())
            if (data.includes("Quit the server with CONTROL-C.")) {
                resolve(server)
            }
        })
        server.stderr.on("data", data => {
            console.error("[backend]", data.toString("utf8").trim())
        })
    })
}

const startFrontend = async (backendPort, frontendPort) => {
    const next = (...args) => {
        return childProcess.fork("node_modules/.bin/next", args, {
            cwd: FRONTEND_DIR,
            stdio: "inherit",
            env: env(backendPort, frontendPort),
        })
    }

    let server
    if (DEBUG) {
        await promisifyChildProcess(next("build", "--no-lint"))
        server = next("start", "--port", frontendPort)
    } else {
        server = next("dev", "--port", frontendPort)
    }

    return server
}

app.whenReady().then(async () => {
    try {
        const [backendPort] = await findFreePort(10000, HOST)
        const [frontendPort] = await findFreePort(15000, HOST)

        if (backendPort == frontendPort) {
            throw new Error("Backend and frontend ports are the same")
        }

        await startBackend(backendPort, frontendPort)
        await startFrontend(backendPort, frontendPort)

        createWindow(frontendPort)

        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow(frontendPort)
            }
        })
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
})

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit()
    }
})
