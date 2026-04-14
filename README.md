# dev-alias

**Get local domains and HTTPS working in seconds. No port juggling, no repetitive setup, no `/etc/hosts` guesswork.**

Zero-touch local domain proxy for local development. Just run your dev server and get a clean local domain with HTTPS. Handles certificate generation, host file updates, and proxying automatically, including automatic proxy port fallback when common ports are already occupied.

## The Problem

Developers spend countless hours fighting local development setup:

```bash
# The usual nightmare:
localhost:3000  ❌ No OAuth (requires https)
                ❌ No Service Workers (requires https)
                ❌ No geolocation/camera (requires https)
                ❌ No webhook testing (localhost won't work)
                ❌ Certificate warnings in browser
                ❌ Can't test subdomains

# With dev-alias:
https://app.localhost  ✅ HTTPS out of the box
                       ✅ Works with OAuth
                       ✅ Service Workers enabled
                       ✅ Zero certificate warnings
                       ✅ Can test subdomains
                       ✅ Works for team (no setup)
```

## Why This Is Important (Especially for Teams)

`dev-alias` is not just a convenience tool; it removes a category of recurring local-environment failures:

- **Fewer blocked developers:** new teammates avoid day-one setup friction.
- **Stable onboarding:** everyone uses the same local domain workflow.
- **Reliable HTTPS-first development:** OAuth, cookies, service workers, and callbacks are testable from day one.
- **Less time lost to port conflicts:** the proxy can automatically fall back to available ports instead of forcing manual reconfiguration.
- **Lower support burden:** fewer “works on my machine” incidents caused by host/cert/domain drift.

For engineering leaders, this means faster onboarding, fewer interrupted dev cycles, and more predictable local testing behavior across the team.

## Installation

### TL;DR for most projects:

```bash
npm install --save-dev dev-alias
# Add one line to your package.json scripts
# Change: "dev": "next dev"
# To:     "dev": "alias -- next dev"
# Done! Run npm run dev
```

## Installation

### For a Project (Recommended)

Add as a dev dependency so your whole team uses it automatically:

```bash
npm install --save-dev dev-alias
```

Then modify your dev script in `package.json`:

```json
{
  "scripts": {
    "dev": "alias -- next dev"  // or your actual dev command
  }
}
```

Now `npm run dev` gives you `https://dev-runner.localhost` automatically.

### Global Installation

```bash
npm install -g dev-alias
alias -- npm run dev
```

### One-off Usage

```bash
npx dev-alias -- npm run dev
```

---

## Real-World Use Cases

### 1. OAuth & Authentication Testing

Testing OAuth providers (GitHub, Google, Auth0) that require HTTPS callbacks:

```json
{
  "scripts": {
    "dev": "alias -- npm run dev:server"
  },
  "alias": {
    "domain": "myapp.localhost",
    "https": true
  }
}
```

Configure your OAuth app with callback: `https://myapp.localhost/auth/callback`

No more "localhost cannot use HTTPS" errors!

### 2. Webhook Development (Stripe, Shopify, GitHub)

Test webhooks locally without tunneling services like ngrok:

```json
{
  "alias": {
    "domain": "api.localhost",
    "https": true
  }
}
```

Register your webhook URL as `https://api.localhost/webhooks/stripe` — dev-alias proxies it to your local server. Stripe won't complain about localhost!

### 3. Service Workers & Progressive Web Apps

Service Workers require HTTPS (and the right domain):

```json
{
  "alias": {
    "domain": "pwa.localhost",
    "https": true
  }
}
```

Now your Service Workers work without HTTPS warnings.

### 4. Subdomain Testing

Test subdomain routing without editing `/etc/hosts`:

```json
{
  "alias": {
    "domain": "myapp.localhost"
  }
}
```

Access:
- `https://myapp.localhost` → your app
- `https://api.myapp.localhost` → same server (if configured)
- `https://admin.myapp.localhost` → same server (if configured)

### 5. Multiple Projects Simultaneously

Run 10 projects at once without port conflicts:

```bash
# Project A
npm run dev  # runs on https://app-a.localhost

# Project B (in another terminal)
npm run dev  # runs on https://app-b.localhost
```

Each gets its own domain. No more "port 3000 already in use"!

## Quick Start

### Basic Usage

Wrap your dev server command with `alias --`:

```bash
alias -- npm run dev
alias -- pnpm dev
alias -- bun run dev
```

Your dev server will be available at `https://dev-runner.localhost` (or your configured domain).

### Configure in package.json

Add the `alias` configuration and wrap your dev script:

```json
{
  "name": "my-project",
  "scripts": {
    "dev": "alias -- npm run dev:raw",
    "dev:raw": "next dev"
  },
  "alias": {
    "domain": "myapp.localhost",
    "https": true
  }
}
```

Now `npm run dev` gives you `https://myapp.localhost` automatically.

### The `npm run dev` Pattern

The recommended setup is a two-stage script that wraps your dev server:

```json
{
  "name": "my-project",
  "scripts": {
    "dev": "alias -- npm run dev:server",
    "dev:server": "next dev"
  },
  "alias": {
    "domain": "myapp.localhost",
    "https": true
  }
}
```

When you run `npm run dev`:
1. `alias` reads the config from your project's `package.json`
2. It starts the actual dev server (`npm run dev:server`)
3. Detects the port (e.g., 3000)
4. Proxies `https://myapp.localhost` to it

Your team just runs `npm run dev` — no global installation needed.

### Domain Options

You can use any domain you like, but these special options resolve to localhost automatically:

| Domain | Notes |
|--------|-------|
| `*.localhost` | Modern browsers (Chrome, Edge, Firefox, Safari) resolve these to 127.0.0.1 automatically. No `/etc/hosts` editing needed. **Recommended.** |
| `*.lvh.me` | Always resolves to 127.0.0.1. Works on any device without hosts file changes. |
| `*.localtest.me` | Same as lvh.me — resolves to 127.0.0.1. |
| `*.test` / `*.dev` | Common choices, but require `/etc/hosts` entries (dev-alias handles this). Note: `.dev` is a real TLD owned by Google. |

**Avoid `.local`:** The `.local` TLD is reserved for mDNS/Bonjour (multicast DNS) and can cause conflicts on macOS and Linux. Use `.localhost` instead.

**Recommended:** Use `.localhost` domains like `myapp.localhost` — they work out of the box in modern browsers.

### Pre-Configured Commands

Define commands in your config for cleaner scripts:

```json
{
  "scripts": {
    "dev": "alias --script dev",
    "start": "alias --script start"
  },
  "alias": {
    "domain": "myapp.localhost",
    "commands": {
      "dev": {
        "command": "next dev",
        "targetPort": 3000
      },
      "start": {
        "command": "next start",
        "domain": "staging.myapp.localhost"
      }
    }
  }
}
```

## How It Works

1. **Starts your dev server** using the command you provide
2. **Detects the port** your server binds to by scanning common ranges or parsing logs
3. **Generates SSL certificates** for your local domain (self-signed, auto-trusted)
4. **Updates /etc/hosts** to map your domain to 127.0.0.1
5. **Starts a proxy** on port 80/443 that forwards to your dev server
6. **Cleans up** hosts entries and certificates on exit

## Configuration

All configuration lives in your project's `package.json` under the `alias` key:

```json
{
  "alias": {
    "domain": "myapp.localhost",
    "https": true,
    "proxyPort": 80,
    "httpsPort": 443,
    "persistHosts": true,
    "portScan": {
      "start": 3000,
      "end": 3100
    },
    "logPatterns": [
      "ready on",
      "listening on"
    ],
    "commands": {
      "dev": {
        "command": "next dev",
        "domain": "dev.myapp.localhost",
        "https": false,
        "targetPort": 3000,
        "portScan": {
          "start": 3000,
          "end": 3005
        },
        "logPatterns": ["Ready in"],
        "env": {
          "NODE_ENV": "development"
        }
      }
    }
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `domain` | string | `dev-runner.localhost` | The local domain to use |
| `https` | boolean | `false` | Enable HTTPS proxying with auto-generated certificates |
| `proxyPort` | number | `80` | HTTP proxy port |
| `httpsPort` | number | `443` | HTTPS proxy port (when https is enabled) |
| `persistHosts` | boolean | `true` | Keep `/etc/hosts` entries after exit |
| `portScan` | object | `{start:3000,end:3100}` | Port range to scan for dev server |
| `logPatterns` | string[] | `[]` | Log patterns that may reveal the listening port |
| `commands` | object | `{}` | Named command configurations |

### Command-Level Options

Commands in `alias.commands` support all root options plus:

| Option | Type | Description |
|--------|------|-------------|
| `command` | string | The command to execute |
| `env` | object | Environment variables for this command |

## CLI Options

```
alias [options] -- <command>

Options:
  -s, --script <name>      Use a pre-configured command from alias.commands
  -d, --domain <domain>    Override the domain
  --proxy-port <port>      HTTP proxy port (default: 80)
  --https-port <port>      HTTPS proxy port (default: 443)
  --target-port <port>     Hint for the dev server port
  --https                  Force HTTPS proxying
  --disable-https          Disable HTTPS even if configured
  --persist-hosts          Keep hosts entries after exit
  --cleanup-hosts          Remove hosts entries on exit
  -e, --env <pair...>      Environment variables (KEY=VALUE)
  -h, --help               Display help

Examples:
  alias -- npm run dev
  alias -d api.localhost -- pnpm dev
  alias --script dev -e NODE_ENV=staging
```

## Why dev-alias?

### vs. Manual `/etc/hosts` Editing
- ❌ Manual: Edit hosts file, generate certificates, remember to clean up
- ✅ dev-alias: Automatic + one command to undo

### vs. Using `.local` Domains
- ❌ `.local` uses mDNS (Bonjour) — unreliable on Linux, slow on macOS, conflicts with real mDNS services
- ✅ `.localhost` is built-in to all modern browsers, no special setup

### vs. ngrok / Cloudflare Tunnel
- ❌ Exposes your local server to the internet (security risk)
- ❌ Costs money or has rate limits
- ❌ Creates public URLs (slower, less reliable for testing)
- ✅ dev-alias is 100% local, free, instant

### vs. Docker
- ❌ Docker adds complexity, requires entire environment setup
- ❌ Can't use your system node/npm installation
- ❌ File mounting issues on Mac/Windows
- ✅ dev-alias is one command, uses your existing setup

### vs. Manually Configuring SSL
- ❌ Self-signed certs cause browser warnings
- ❌ Installing root certs is finicky on each machine
- ✅ dev-alias generates and reuses local cert files automatically, so teams avoid ad-hoc OpenSSL commands and one-off SSL setup drift

---

## Team Usage

**No global installation required.** The best approach is to add `dev-alias` as a dev dependency:

```bash
npm install --save-dev dev-alias
```

Then configure your `package.json` as shown above. Now anyone cloning your repo just runs:

```bash
npm install
npm run dev
```

And gets `https://myapp.localhost` automatically.

### Option 1: Dev Dependency (Recommended)

```json
{
  "devDependencies": {
    "dev-alias": "^0.1.0"
  },
  "scripts": {
    "dev": "alias -- npm run dev:server",
    "dev:server": "next dev"
  }
}
```

Team members don't need to know dev-alias exists — it just works when they run the standard `npm run dev`.

### Option 2: Global Installation

Useful if you want to quickly proxy any project without modifying its package.json:

```bash
npm install -g dev-alias
alias -- npm run dev
```

### Option 3: npx (No Install)

```bash
npx dev-alias -- npm run dev
```

## Environment Variables

- `DEBUG` — Enable verbose debug output

## Troubleshooting

### Certificate Warning in Browser

**Issue:** "Your connection is not private" or similar warning

**Solution:**
This is normal for self-signed certificates. You can:
1. Click "Advanced" → "Proceed anyway" (browser will remember)
2. Or, trust the certificate permanently:
   - Find the cert at `~/.dev-alias/`
   - Install it in your browser/system's certificate store

For most local development, just ignore the warning—browsers cache the decision.

### Port Already in Use

**Issue:** `Error: Port 80 already in use`

**Solution:**
Change the proxy port in your config:

```json
{
  "alias": {
    "proxyPort": 8080,
    "domain": "myapp.localhost"
  }
}
```

Then access `https://myapp.localhost:8080`

### `/etc/hosts` Not Updating

**Issue:** Domain resolves to wrong IP or doesn't resolve

**Solution:**
1. Check that you're running with `sudo` permissions (needed for ports < 1024)
2. Flush your DNS cache:
   - **macOS:** `sudo dscacheutil -flushcache`
   - **Linux:** `sudo systemctl restart systemd-resolved`
3. Verify hosts entry: `cat /etc/hosts | grep localhost`

### Dev Server Not Detected

**Issue:** `Error: Could not detect port`

**Solution:**
Manually hint the port:

```bash
alias --target-port 3000 -- npm run dev
```

Or in config:

```json
{
  "alias": {
    "commands": {
      "dev": {
        "command": "npm run dev:server",
        "targetPort": 3000
      }
    }
  }
}
```

### Can't Access Domain from Other Machines

**Limitation:** `*.localhost` only works on the same machine. To access from other machines on your network, use `.lvh.me` or `.localtest.me`:

```json
{
  "alias": {
    "domain": "myapp.lvh.me"
  }
}
```

Then other machines can access `https://myapp.lvh.me` (which resolves to your IP).

---

## Requirements

- Node.js 18+
- macOS, Linux, or Windows (WSL)
- Administrator/sudo access for modifying `/etc/hosts` and binding ports < 1024

## License

MIT
