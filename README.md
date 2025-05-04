# Remote Reboot Server

A minimal and secure Node.js + Express server to remotely trigger system reboots over HTTPS.  
Designed for internal or controlled environments, especially useful when remote access tools like SSH, RDP, or TeamViewer fail.

## 🔐 Security Features

- ✅ Secure communication via HTTPS (self-signed or valid certs)
- ✅ Authentication using a custom `x-api-key` header
- ✅ Rate limiting to prevent brute-force attacks
- ✅ Detailed audit logging (method, URL, headers, IP, timestamp)
- ✅ Hidden, non-obvious endpoint path
- ✅ Rejection and logging of any unhandled requests

> 💡 **Note:** SSL certificates can be self-signed — encryption is the key concern, not trust chains.

## 🚀 Usage

1. Generate SSL certificates (`make_ssl_cert.sh` or `make_ssl_cert.bat`)
2. Run the server:

```bash
PORT=51822 TOKEN=your_secure_token node server.js
```

3. Send a GET request with the `x-api-key` header:

```bash
curl -k -H "x-api-key: your_secure_token" https://your-server:51822/sys/hook/trigger-57829c4/
```

## ⚠️ Warning

- Do not expose this server to the public internet unless you understand and accept the security risks.
- Do not use this server to manage machines you don’t control.
- Audit logs are stored in `audit.log` and should be monitored.

## 🛠️ Systemd Service (Linux)

Save the following as `/etc/systemd/system/reboot-server.service`:

```ini
[Unit]
Description=Remote Reboot Server
After=network.target

[Service]
ExecStart=/usr/bin/env PORT=51822 TOKEN=your_secure_token node /opt/remote-reboot/server.js
WorkingDirectory=/opt/remote-reboot
Restart=always
User=youruser

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable reboot-server
sudo systemctl start reboot-server
```

## 🛠️ Additional Setup Notes

### 🔐 Sudo Permission (Linux Only)

If you're running this on a **Linux system**, and the server is expected to reboot the system via `sudo reboot`, make sure the specified user has passwordless sudo rights for that command.

You can add the following line to the sudoers file using `visudo`:

```bash
youruser ALL=(ALL) NOPASSWD: /sbin/reboot
```

Replace youruser with the actual Linux user running the service.

⚠️ Be careful when editing the sudoers file — incorrect syntax can lock you out.

### 📡 Binding to Privileged Ports (<1024)

If you want to run the server on ports like 443 (HTTPS), you'll need to grant special permissions to Node.js or use a reverse proxy.

**Option A: Use setcap (not recommended for frequent updates)**

```bash
sudo setcap 'cap_net_bind_service=+ep' $(which node)
```

**Option B: Use a reverse proxy (recommended)**
Set up Nginx or Apache to listen on port 443 and forward traffic to the Node.js app running on a higher port (e.g. 51822).

## 📁 Logs

- `audit.log`: full details of every hit (IP, headers, method, etc.)
- `requests.log`: legacy basic token+IP logging

## 📄 License

MIT
