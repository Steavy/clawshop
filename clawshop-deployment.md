# ClawShop (Webshop) Deployment Guide

## Vereisten
- Docker en Docker Compose geïnstalleerd
- SSH toegang tot de server als root
- Node.js project met `server.js` als entry point

## Projectstructuur
```
clawshop/
├── docker-compose.yml
├── website/
│   ├── server.js
│   ├── package.json
│   └── ...
└── pw-results/
```

## Installatie

### 1. Map aanmaken op de server
```bash
mkdir -p /opt/clawshop
```

### 2. Project files kopiëren
Vanaf je lokale machine:
```bash
rsync -avz -e "ssh -i ~/.ssh/id_ed25519" ./clawshop/ root@<server-ip>:/opt/clawshop/
```

### 3. Poort aanpassen (optioneel)
Default is poort 5000. Pas aan in `/opt/clawshop/docker-compose.yml`:
```yaml
ports:
  - "5000:5000"  # verander eerste getal voor andere poort
```

### 4. Services starten
```bash
cd /opt/clawshop
docker compose up -d
```

### 5. Verifiëren
```bash
docker ps | grep webshop
docker logs webshop
```

## Toegang
- **URL**: `http://<server-ip>:5000` of `http://<jouw-domain>:5000`

## Docker Compose Referentie

```yaml
services:
  webshop:
    image: node:22-alpine
    container_name: webshop
    networks:
      - webshop-net
    ports:
      - "5000:5000"
    working_dir: /app
    command: >
      sh -c "npm install && node server.js"
    volumes:
      - ./website:/app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:5000/api/products"]
      interval: 30s
      timeout: 5s
      retries: 3

networks:
  webshop-net:
    name: webshop-net
```

## Configuratie
| Waarde | Standaard | Beschrijving |
|--------|-----------|--------------|
| Poort | 5000 | HTTP poort |
| Image | node:22-alpine | Node.js runtime |
| Working dir | /app | Map in container |
| Restart | unless-stopped | Auto-restart bij crashes |

## Updates (code wijzigen)
Omdat het project gemount is als volume (`./website:/app`), worden code wijzigingen direct doorgevoerd. Herstart de container:
```bash
cd /opt/clawshop
docker compose restart webshop
```

## Rebuild (bij dependency wijzigingen)
```bash
cd /opt/clawshop
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Logs bekijken
```bash
# Live logs
docker logs -f webshop

# Laatste 50 regels
docker logs webshop --tail 50
```

## Stoppen/Starten
```bash
# Stoppen
docker compose down

# Starten
docker compose up -d

# Herstarten
docker compose restart
```

## Probleemoplossing
- **Poort bezet**: Check `ss -tlnp | grep 5000` en pas de compose file aan
- **NPM errors**: Log in de container: `docker exec -it webshop sh` dan `npm install` handmatig draaien
- **Healthcheck faalt**: Controleer of `/api/products` endpoint bestaat, of pas de healthcheck URL aan
