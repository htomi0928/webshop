const { spawn } = require("node:child_process")

const isWin = process.platform === "win32"
const npmCmd = isWin ? "npm.cmd" : "npm"

function run(cmd, args, { allowFailure = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: isWin,
    })

    child.on("error", (err) => reject(err))
    child.on("exit", (code) => {
      if (code === 0 || allowFailure) {
        resolve()
        return
      }
      reject(new Error(`${cmd} ${args.join(" ")} failed with exit code ${code}`))
    })
  })
}

function startDevProcess(prefixPath) {
  return spawn(npmCmd, ["--prefix", prefixPath, "run", "dev"], {
    stdio: "inherit",
    shell: isWin,
  })
}

async function main() {
  console.log("[start:dev:medusa] Stopping docker backend/storefront/caddy if running...")
  await run("docker", ["compose", "stop", "backend", "storefront", "caddy"], {
    allowFailure: true,
  })

  console.log("[start:dev:medusa] Starting postgres + redis...")
  await run("docker", ["compose", "up", "-d", "postgres", "redis"])

  console.log("[start:dev:medusa] Starting backend + storefront dev servers...")
  const backend = startDevProcess("backend")
  const storefront = startDevProcess("storefront")

  const shutdown = () => {
    if (!backend.killed) backend.kill()
    if (!storefront.killed) storefront.kill()
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
  process.on("exit", shutdown)

  backend.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[start:dev:medusa] Backend exited with code ${code}`)
    }
    shutdown()
    process.exit(code || 0)
  })

  storefront.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[start:dev:medusa] Storefront exited with code ${code}`)
    }
    shutdown()
    process.exit(code || 0)
  })
}

main().catch((err) => {
  console.error("[start:dev:medusa] Failed:", err.message)
  process.exit(1)
})
