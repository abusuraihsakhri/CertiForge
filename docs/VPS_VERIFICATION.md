# CertiForge VPS Verification Deployment Guide

This guide describes a secure way to make CertiForge certificates independently verifiable by employers, universities, hospitals, conference organizers, credentialing bodies, and other third parties.

The recommended design keeps certificate signing **local to the issuer** and uses the VPS only as a **public verification authority**.

## 1. Security model

Use this model:

```text
Issuer browser / CertiForge
  |
  |-- private ECDSA P-256 key: stays on issuer device
  |-- signs certificate payload hash
  |
  +--> certificate PDF with QR
  +--> public verification registry
         |
         | HTTPS upload
         v
Oracle VPS
  |
  |-- public ECDSA key
  |-- certificate ID
  |-- payload hash
  |-- signature
  |-- optional public metadata
  |-- status / revocation data
  |
  v
External verifier scans QR
```

### Never upload the private signing key

An EC P-256 **public JWK** normally contains fields such as:

```json
{
  "kty": "EC",
  "crv": "P-256",
  "x": "...",
  "y": "..."
}
```

A private EC JWK also contains a field named:

```json
"d": "..."
```

If a JWK contains `d`, treat it as private key material. Do not place it in a web root, public registry, Git repository, browser bundle, public API response, or VPS-hosted verification file.

CertiForge's exported `verification-registry.json` contains the public key for schema-3 ECDSA verification. The encrypted signing-key backup is different: keep that backup offline or in a protected secrets/backup system.

## 2. What the QR-code fix changes

CertiForge first creates a fallback keyed digest while building a certificate verification context. When ECDSA is available, the generator replaces that digest with an ECDSA P-256 signature.

Before v0.8.1, the generator updated the registry signature but accidentally retained the earlier QR URL. A generated PDF could therefore contain:

```text
QR -> fallback digest
registry -> ECDSA signature
```

The verifier correctly rejected that mismatch.

v0.8.1 rebuilds the QR URL after the final signature is known:

```text
QR -> ECDSA signature + payload hash + certificate ID
registry -> same ECDSA signature + same payload hash + same certificate ID
```

The verifier also now requires all three values to correspond to the **same registry entry** before returning an ECDSA-verified result.

## 3. Recommended deployment stages

Use two stages.

### Stage A — simple static verification

Start here.

The VPS serves:

- CertiForge's verification page
- `verification-registry.json`
- the public ECDSA key contained in that registry
- static CSS and JavaScript required by the verifier

No application database is required.

This is appropriate for one registry/event or for a controlled deployment where you replace or deliberately aggregate the registry.

### Stage B — verification API

Move to this when you need:

- multiple projects and signing keys
- certificate revocation
- replacement/superseded certificates
- public certificate metadata
- an issuance audit trail
- certificate lookup without downloading a large JSON file

The API should still never receive the private signing key.

---

# Stage A: Static verification on an Oracle VPS

## 4. Choose a verification hostname

Use a stable hostname such as:

```text
verify.example.com
```

Do not use an IP address in the final QR if you can avoid it. A domain lets you replace or migrate the VPS without reissuing certificates.

Create an A record:

```text
verify.example.com -> <VPS_PUBLIC_IP>
```

If you use IPv6, also create the appropriate AAAA record.

Verify DNS before continuing:

```bash
dig +short verify.example.com
```

It should return the VPS public IP.

## 5. Oracle Cloud network rules

In Oracle Cloud Infrastructure, locate the VCN/subnet security list or Network Security Group attached to the instance.

Allow public inbound traffic:

| Protocol | Source | Destination port | Purpose |
|---|---|---:|---|
| TCP | `0.0.0.0/0` | 80 | HTTP / ACME redirect and certificate issuance |
| TCP | `0.0.0.0/0` | 443 | HTTPS verification |
| TCP | `<YOUR_ADMIN_IP>/32` | 22 | SSH administration |

Do **not** leave SSH on port 22 open to `0.0.0.0/0` unless you have a specific reason.

If IPv6 is enabled, add equivalent IPv6 rules only where required.

Oracle networking and the operating-system firewall are separate layers. Both must permit the required traffic.

## 6. Update the VPS

The examples below assume Ubuntu.

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl ca-certificates jq rsync
```

Check the active firewall before changing it:

```bash
sudo ufw status verbose
sudo nft list ruleset
```

If UFW is the firewall you use:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Do not blindly layer UFW rules over an existing custom nftables/iptables policy. Use the firewall system already managing the server.

## 7. Install Caddy

Caddy is convenient here because it can automatically provision and renew HTTPS certificates for a public hostname.

On Ubuntu/Debian, use Caddy's official package repository:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list

sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list

sudo apt update
sudo apt install -y caddy
```

Confirm it is running:

```bash
systemctl status caddy --no-pager
```

## 8. Create the verification web root

```bash
sudo mkdir -p /srv/certiforge-verify/css
sudo mkdir -p /srv/certiforge-verify/js
sudo mkdir -p /srv/certiforge-verify/icons

sudo chown -R "$USER":"$USER" /srv/certiforge-verify
```

The verifier needs at least these repository files:

```text
verify.html
manifest.json
css/main.css
css/responsive.css
css/verify.css
css/atelier.css
js/verify.js
js/utils.js
js/crypto.js
js/theme.js
icons/icon.svg
icons/icon-maskable.svg
verification-registry.json
```

You can copy the verifier files from a checked-out CertiForge repository.

Example:

```bash
git clone https://github.com/abusuraihsakhri/CertiForge.git
cd CertiForge

cp verify.html manifest.json /srv/certiforge-verify/
cp css/main.css css/responsive.css css/verify.css css/atelier.css /srv/certiforge-verify/css/
cp js/verify.js js/utils.js js/crypto.js js/theme.js /srv/certiforge-verify/js/
cp icons/icon.svg icons/icon-maskable.svg /srv/certiforge-verify/icons/
```

## 9. Configure Caddy

Replace `verify.example.com` with the real hostname.

Edit:

```bash
sudo nano /etc/caddy/Caddyfile
```

Use:

```caddyfile
verify.example.com {
    root * /srv/certiforge-verify

    encode zstd gzip

    @registry path /verification-registry.json
    header @registry Cache-Control "no-store, max-age=0"

    header {
        X-Content-Type-Options "nosniff"
        Referrer-Policy "no-referrer"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
        X-Frame-Options "DENY"
    }

    file_server
}
```

Validate the configuration:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
```

Reload Caddy:

```bash
sudo systemctl reload caddy
```

Caddy can automatically obtain and renew a publicly trusted TLS certificate when the hostname resolves to the VPS and ports 80 and 443 are reachable.

Verify:

```bash
curl -I https://verify.example.com/verify.html
```

## 10. Export the registry from CertiForge

After generating a certificate batch, download:

```text
verification-registry.json
```

For the ECDSA schema, it should resemble:

```json
{
  "schema": 3,
  "publicKey": {
    "kty": "EC",
    "crv": "P-256",
    "x": "...",
    "y": "..."
  },
  "certificates": [
    {
      "id": "CONF-2026-0001",
      "sig": "...",
      "h": "..."
    }
  ]
}
```

Confirm that the public key does **not** contain `d`:

```bash
jq '.publicKey' verification-registry.json
jq 'has("publicKey") and (.publicKey | has("d") | not)' verification-registry.json
```

The second command should print:

```text
true
```

## 11. Upload the registry safely

Copy the new registry to a temporary filename:

```bash
scp verification-registry.json ubuntu@<VPS_PUBLIC_IP>:/tmp/verification-registry.json
```

On the VPS, validate it before publishing:

```bash
python3 -m json.tool /tmp/verification-registry.json >/dev/null
jq '.schema, .totalCertificates, .publicKey.kty, .publicKey.crv' /tmp/verification-registry.json
```

Publish it atomically:

```bash
sudo install -m 0644 /tmp/verification-registry.json /srv/certiforge-verify/verification-registry.json.new
sudo mv /srv/certiforge-verify/verification-registry.json.new /srv/certiforge-verify/verification-registry.json
rm -f /tmp/verification-registry.json
```

Check the public copy:

```bash
curl -fsS https://verify.example.com/verification-registry.json | jq '.schema, .totalCertificates'
```

## 12. Point CertiForge QR codes at the VPS

Do this only after the VPS verification hostname is live.

CertiForge currently has a verification base URL in:

```text
js/config.js
```

The intended permanent QR destination should be your stable hostname, for example:

```js
export const verifyBaseUrl = "https://verify.example.com/verify.html";
```

Important: the current browser helper uses the application's own HTTP origin when CertiForge is running from GitHub Pages. Before switching production QR codes to the VPS, update that helper so the configured verification URL is authoritative rather than only a `file://` fallback.

Do not issue permanent certificates until you have scanned a generated test certificate and confirmed that its QR opens the final public verification hostname.

## 13. End-to-end verification test

Create a test certificate.

The QR URL should contain:

```text
id=<certificate-id>
sig=<ECDSA-signature>
h=<payload-hash>
```

Then:

1. Scan the QR from a different phone or computer.
2. Confirm the browser opens the HTTPS verification hostname.
3. Confirm the page loads the public registry.
4. Confirm the certificate ID exists.
5. Confirm the registry's stored hash equals the QR hash.
6. Confirm the registry's stored signature equals the QR signature.
7. Confirm ECDSA P-256 verification succeeds with the published public key.
8. Alter one character in `id`, `sig`, or `h` in the URL and confirm verification fails.
9. Test an unknown certificate ID and confirm it reports not found.

Do not rely only on testing from the VPS itself.

---

# Stage B: Public verification API

Static JSON works, but an API is preferable for a long-lived credential service.

## 14. Recommended database model

A minimal SQLite schema:

```sql
CREATE TABLE issuer_keys (
    key_id TEXT PRIMARY KEY,
    public_jwk TEXT NOT NULL,
    created_at TEXT NOT NULL,
    retired_at TEXT
);

CREATE TABLE certificates (
    certificate_id TEXT PRIMARY KEY,
    payload_hash TEXT NOT NULL,
    signature TEXT NOT NULL,
    key_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    issued_at TEXT NOT NULL,
    revoked_at TEXT,
    replaced_by TEXT,
    FOREIGN KEY (key_id) REFERENCES issuer_keys(key_id)
);

CREATE INDEX idx_certificates_status
ON certificates(status);
```

If external verifiers need to compare the visible certificate against the issuer's authoritative record, add only the public metadata you actually want to disclose, for example:

```sql
ALTER TABLE certificates ADD COLUMN recipient_name TEXT;
ALTER TABLE certificates ADD COLUMN credential_title TEXT;
ALTER TABLE certificates ADD COLUMN event_name TEXT;
ALTER TABLE certificates ADD COLUMN issuer_name TEXT;
ALTER TABLE certificates ADD COLUMN issue_date TEXT;
```

Avoid publishing email addresses, phone numbers, home addresses, registration numbers, or other unnecessary personal information.

## 15. Why public metadata may be necessary

A hash-only registry proves that the issuer signed a particular payload hash.

It does **not** allow an outside verifier to visually compare the name or credential printed on a potentially altered PDF unless those authoritative fields are also available to the verification application.

For external credential checking, a useful public result is:

```text
Certificate ID: CONF-2026-0001
Recipient: NAME
Credential: Certificate of Participation
Event: Example Conference
Issuer: Example Organization
Issue date: 22 September 2026
Status: Active
Cryptographic signature: Verified
```

The verifier can then compare the public authoritative record with the document in front of them.

## 16. API endpoints

Public read-only endpoints:

```text
GET /api/v1/certificates/{certificate_id}
GET /api/v1/keys/{key_id}
```

Administrative endpoints:

```text
POST /api/v1/certificates
POST /api/v1/certificates/{certificate_id}/revoke
POST /api/v1/certificates/{certificate_id}/replace
POST /api/v1/keys
```

The public endpoints require no login.

The administrative endpoints must require strong authentication.

## 17. Never embed an admin API token in GitHub Pages

CertiForge is a client-side application. Any long-lived secret placed in its JavaScript bundle can be recovered by anyone who loads the site.

Do not write this:

```js
const ADMIN_API_TOKEN = "secret-token";
```

Safer publishing options are:

1. manually upload/import the registry from an administrator workstation;
2. use a local command-line publisher that reads the exported registry and sends it to the VPS;
3. use an authenticated administrator portal with a short-lived session;
4. later integrate OAuth/passkey authentication for issuer accounts.

The public verification API does not need a secret.

## 18. API service isolation

If you deploy an application API, bind it only to localhost, for example:

```text
127.0.0.1:8000
```

Then let Caddy expose it:

```caddyfile
verify.example.com {
    root * /srv/certiforge-verify

    handle /api/* {
        reverse_proxy 127.0.0.1:8000
    }

    handle {
        file_server
    }
}
```

Do not expose the database port or application port directly to the internet.

## 19. Verification response example

A public API response can look like:

```json
{
  "certificateId": "CONF-2026-0001",
  "recipientName": "NAME",
  "credentialTitle": "Certificate of Participation",
  "eventName": "Example Conference",
  "issuerName": "Example Organization",
  "issueDate": "2026-09-22",
  "status": "active",
  "payloadHash": "...",
  "signature": "...",
  "keyId": "issuer-2026-01"
}
```

The verification application should:

1. retrieve the certificate record;
2. retrieve or cache the corresponding public key;
3. confirm the certificate is active;
4. confirm the QR hash matches the registered hash;
5. confirm the QR signature matches the registered signature;
6. verify the ECDSA signature;
7. display the authoritative public metadata.

## 20. Revocation

Do not delete revoked records.

Use:

```text
status = revoked
revoked_at = timestamp
```

The public verifier should clearly display:

```text
REVOKED
```

A revoked credential must not receive a green valid status even if its historical ECDSA signature is cryptographically correct.

Cryptographic validity means the issuer signed it; revocation status means the issuer still considers it valid.

## 21. Key rotation

Do not overwrite an old public key when rotating keys.

Use identifiers such as:

```text
issuer-2026-01
issuer-2027-01
```

Each certificate record stores the `key_id` used to sign it.

Old public keys remain available for verification even after they are retired from new issuance.

The private counterpart of a retired key can be archived securely or destroyed according to the issuer's retention policy, but the public key should remain available as long as certificates signed by that key need to be verifiable.

## 22. Backups

Back up:

- the certificate database or registry;
- public keys;
- revocation/status records;
- server configuration.

Back up the private issuer key separately from the public verification server.

For CertiForge's encrypted private-key backup:

- use a strong unique passphrase;
- keep at least two protected copies;
- do not store the passphrase alongside the backup;
- do not place the backup in `/srv/certiforge-verify`;
- do not commit it to Git.

## 23. Logging and privacy

Do not log unnecessary recipient data.

The current QR design puts only:

- certificate ID;
- signature;
- payload hash

in the query string.

If you later expose public metadata, return it from the verification endpoint rather than putting it directly into the QR URL.

Review web-server logs if local privacy law or institutional policy imposes retention requirements.

## 24. Server hardening checklist

Before production use:

- SSH uses keys, not password authentication.
- SSH access is restricted by source IP where practical.
- Ports 80 and 443 are the only public web ports.
- The app/API listens only on localhost behind Caddy.
- Automatic security updates are considered/enabled according to your server policy.
- Caddy and the OS are kept updated.
- Registry/database backups are tested.
- Private issuer keys are not present on the public VPS.
- No admin token exists in client-side JavaScript.
- The database is outside the public web root.
- HTTPS is valid without browser warnings.
- Revoked certificates cannot display as active.
- Old public keys remain available for historical verification.

## 25. Recommended CertiForge production architecture

For long-term external verification:

```text
CertiForge on GitHub Pages
        |
        | local ECDSA signing
        |
        +--> PDF certificate
        |
        +--> signed registry records
                 |
                 | authenticated publication
                 v
        Oracle VPS / verify.example.com
                 |
        +--------+---------+
        |                  |
  public verifier      public API
        |                  |
        +--------+---------+
                 |
              SQLite
                 |
        IDs / hashes / signatures
        public keys / status
        optional public metadata
```

The private ECDSA signing key remains with the issuer and is not required for public verification.

## 26. Final production test

Before issuing real certificates:

- generate at least two certificates;
- scan both QR codes from external devices;
- verify each certificate resolves to its own record;
- try swapping one certificate's QR parameters onto the other's ID and confirm failure;
- modify the hash and confirm failure;
- modify the signature and confirm failure;
- use an unknown ID and confirm not-found;
- revoke a test certificate and confirm the public page shows revoked;
- verify HTTPS from a network other than the VPS;
- verify the public API/registry does not expose a private JWK `d` field;
- confirm the private signing-key backup is not on the VPS.

Only after these checks should the VPS verification URL be used for permanent issued certificates.

## References

- Oracle Cloud Infrastructure security lists: https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securitylists_working.htm
- Caddy installation: https://caddyserver.com/docs/install
- Caddy HTTPS quick start: https://caddyserver.com/docs/quick-starts/https
- Caddy automatic HTTPS: https://caddyserver.com/docs/automatic-https
