# IT Inventory Server Windows installer

The installer packages the production React build, compiled Express backend, production Node dependencies, the native `better-sqlite3` runtime, a private Node.js runtime, and database migrations. End users do not need Node.js, npm, SQLite, VS Code, or Inno Setup. The installer build verifies the bundled SQLite runtime before creating the setup executable.

## Build prerequisites

- Windows 10/11
- Node.js 18+ and npm 9+
- [Inno Setup 6](https://jrsoftware.org/isinfo.php) installed in its standard location
- Project dependencies installed from the repository root

Run `npm run build:installer`. The output is `installer/output/IT-Inventory-Server-Setup-1.0.0.exe`.

## Install and launch

The default binary location is `C:\Program Files\IT Inventory Server`. During setup you choose the **network port** the server listens on (default `3000`). The Start Menu shortcut launches a hidden backend, waits for `/api/health`, and opens `http://127.0.0.1:<port>` in the server's default browser. Repeated launches reuse the healthy backend.

The chosen port is saved to `%PROGRAMDATA%\IT-Inventory-Server\config\port.txt`; the launcher and startup task read it (an `INVENTORY_PORT` environment variable overrides it). The installer opens a Windows Firewall rule for that TCP port on Private and Domain networks. Other computers on the trusted LAN can then open `http://SERVER-NAME:<port>` or `http://SERVER-IP:<port>`.

### Ports and DNS (A records)

The server binds to all network interfaces (`0.0.0.0`), so it is reachable by hostname or IP with no extra configuration. A DNS **A record** simply maps a name to this server's IP and works on any port — but the port only disappears from the URL when the server listens on **80** (HTTP). So:

- **Port 3000 (default):** reach it at `http://server-ip:3000` or, with an A record, `http://inventory.yourschool.edu:3000`.
- **Port 80:** reach it at `http://server-ip` or, with an A record, `http://inventory.yourschool.edu` — no port number needed. Choose `80` on the port page. Make sure IIS or another web server is not already using port 80 on this machine.

Ensure the server uses a Private or Domain network profile and has a stable hostname or IP address. The packaged HTTP deployment is intended for a trusted internal LAN; use a reverse proxy with HTTPS (port 443) before exposing it to an untrusted network.

## Persistent application data

Writable data is stored at `%PROGRAMDATA%\IT-Inventory-Server\`. The installer never bundles or automatically adopts another installation's database, credentials, or branding. Upgrades and normal uninstall preserve this directory.

To remove all data permanently, uninstall first, confirm the records are no longer needed, then manually delete the ProgramData directory.

## Upgrade and uninstall

Run a newer installer with the same AppId to replace application binaries while retaining ProgramData. Uninstall stops the packaged backend and removes binaries and shortcuts without deleting inventory or backups.

## Initial administrator

Migrations run on first launch. When no System Administrator exists, the launcher opens `/setup` so the installer can create the first account using the normal password policy and hashing. The setup endpoint closes permanently as soon as that administrator exists. No password or `.env` file is packaged. Automated deployments may still provide `INITIAL_ADMIN_USERNAME` and `INITIAL_ADMIN_PASSWORD` through the server environment.

## Troubleshooting

- Review `%PROGRAMDATA%\IT-Inventory-Server\logs\backend-error.log` if launch fails (or the legacy data directory after an upgrade).
- Confirm port 3000 is not occupied by another application.
- If `ISCC.exe` is missing, install Inno Setup 6 and retry.
- Back up ProgramData before major upgrades.
