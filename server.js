/**
 * This is a simple Express server that listens for incoming requests to trigger a system reboot.
 * It uses HTTPS for secure communication and includes rate limiting to prevent abuse.
 * The server checks for a valid token in the request and logs the request details to a file.
 * The server is designed to run on both Windows and Linux platforms.
 *
 * Use this server responsibly and ensure you have the necessary permissions to reboot the system.
 * This code is for educational purposes only and should not be used in production without proper security measures.
 * Make sure to replace the AUTH_TOKEN with a secure token and store it securely.
 * The server can uses self-signed SSL certificates for HTTPS, to generate them excute make_ssl_cert.sh or make_ssl_cert.bat (Windows).
 * In a production environment, use valid SSL certificates.
 *
 * @license MIT
 */

// Import required modules
const { exec } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");
const rateLimit = require("express-rate-limit");
const https = require("https");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 51822;

const privateKey = fs.readFileSync("ssl/key.pem", "utf8");
const certificate = fs.readFileSync("ssl/cert.pem", "utf8");
const credentials = { key: privateKey, cert: certificate };

const httpsServer = https.createServer(credentials, app);

// Define your token (in a real-world application, store this securely)
const AUTH_TOKEN =
  process.env.TOKEN || "RTj2YMf8XPGa1jbvfwzrO1gpX25vtEh1bcSx3pg6TtjLM";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 requests by IP
  handler: (req, res) => {
    console.log(`Rate limit exceeded - IP: ${req.ip}`);
    res.socket.destroy();
  },
});

// Function to log requests
const logRequest = (token, ip) => {
  const logFilePath = path.join(__dirname, "requests.log");
  const logEntry = `${new Date().toISOString()} - Token: ${token} - IP: ${ip}\n`;
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error(`Failed to write log: ${err.message}`);
    }
  });
};

const logAudit = (req, customNote = "") => {
  const logFilePath = path.join(__dirname, "audit.log");

  console.log(
    `Impacted at ${new Date().toISOString()} - ${req.method} ${
      req.originalUrl
    } from ${req.ip}`
  );

  // Log the request details
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const pathAccessed = req.originalUrl;
  const method = req.method;
  const userAgent = req.headers["user-agent"] || "Unknown";
  const query = JSON.stringify(req.query);

  const rawHeaders = { ...req.headers };
  const sensitiveHeaders = [
    "authorization",
    "x-api-key",
    "cookie",
    "set-cookie",
  ];

  for (const key of sensitiveHeaders) {
    if (rawHeaders[key]) {
      rawHeaders[key] = "[REDACTED]";
    }
  }
  const headers = JSON.stringify(rawHeaders, null, 2);

  const logEntry = `Impacted at ${new Date().toISOString()} - ${method} ${pathAccessed} from ${ip}
  User-Agent: ${userAgent}
  Query: ${query}
  Headers: ${headers}
  Note: ${customNote}
  
  ----------------------------------------------------------
  `;

  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error(`Failed to write audit log: ${err.message}`);
    }
  });
};

// Middleware to limit the rate of requests
// This middleware should be applied after the token authentication
// to ensure that the rate limit is enforced only for authenticated requests
// and not for the initial token check.
// Comment if you want to disable rate limiting on whole server
app.use(limiter);

// this endpoint has rate limiting
app.get("/sys/hook/trigger-57829c4/", limiter, (req, res) => {
  logAudit(req, "Reboot endpoint accessed");

  const token = req.headers["x-api-key"];
  const realIP = req.headers["x-forwarded-for"] || req.remoteAddress;

  // show the IP address of the request in the console
  console.log(
    `Incoming request from IP ${realIP} at ${new Date().toISOString()}`
  );

  // Log the request details
  logRequest(token, realIP);

  if (token === AUTH_TOKEN) {
    // Token is valid, show the IP address in the console
    console.log(`Token Valid - IP: ${realIP}`);
    //restart rate limiter
    limiter.resetKey(realIP);
  } else {
    // don't send a response to the client
    // just log the invalid token attempt
    console.log(`Token Invalid - IP: ${realIP}`);

    res.socket.destroy();
    return null;
  }

  const platform = os.platform();

  let command;

  if (platform === "win32") {
    command = "shutdown /r /t 100";
  } else if (platform === "linux") {
    command = "sudo reboot";
  } else {
    // the token is valid but the OS is not supported, send an error response
    return res.status(400).json({ status: "error", message: "Unsupported OS" });
  }

  // show the command in the console
  console.log(`Executing command: ${command}`);

  // Execute the command to reboot the system
  exec(command, (error, stdout, stderr) => {
    if (error) {
      // error occurred, show the error in the console
      console.error(`Error: ${error.message}`);
      // send an error response to the client (because the token is valid)
      return res.status(500).json({ status: "error", message: error.message });
    }
    if (stderr) {
      // stderr occurred, show the error in the console
      console.error(`Stderr: ${stderr}`);
      // send an error response to the client (because the token is valid)
      return res.status(500).json({ status: "error", message: stderr });
    }
    // command executed successfully, show the output in the console
    console.log(`Stdout: ${stdout}`);
    // send a success response to the client (because the token is valid)
    res
      .status(200)
      .json({ status: "success", message: "Rebooting the system" });
  });
});

// catch-all route for unhandled requests
app.use("*", (req, res) => {
  logAudit(req, "Unhandled route accessed");
  res.socket.destroy();
});

// start the HTTPS server
httpsServer.listen(PORT, () => {
  console.log(`HTTPS server running on port ${PORT}`);
});
