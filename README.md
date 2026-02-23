# dev-alias

Zero-touch local domain proxy for local development. No configuration files, no manual hosts editing, no certificate management — just run your dev server and get a clean local domain with HTTPS.

## What Problem Does This Solve?

When developing locally, you often need:

- **A clean domain** instead of `localhost:3000` — essential for OAuth callbacks, webhooks, or testing subdomains
- **HTTPS** for features like Service Workers, geolocation, or camera access
- **Multiple projects** running simultaneously without port conflicts
- **No browser security warnings** about self-signed certificates

dev-alias handles all of this automatically. It detects when your dev server starts, proxies it to a custom local domain, manages SSL certificates, and updates your `/etc/hosts` — all without manual intervention.

## Installation

### For a Project (Recommended)

Add as a dev dependency so your whole team uses it automatically:

```bash
npm install --save-dev dev-alias
```

### Global Installation

```bash
npm install -g dev-alias
```

### One-off Usage

```bash
npx dev-alias -- npm run dev
```

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

## Requirements

- Node.js 18+
- macOS, Linux, or Windows (WSL)
- Administrator/sudo access for modifying `/etc/hosts` and binding ports < 1024

## License

MIT
