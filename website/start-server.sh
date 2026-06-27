#!/bin/bash
# start-server.sh — Webshop server met automatische restart bij crash
# Gebruik: ./start-server.sh

cd "$(dirname "$0")"

LOGFILE="/tmp/webshop.log"
MAX_RESTARTS=10
RESTART_COUNT=0
RESTART_WINDOW=60  # seconds

echo "🛒 Start webshop server..."
echo "📄 Logfile: $LOGFILE"

restart_server() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') 🚀 Server start..." >> "$LOGFILE"
    node server.js >> "$LOGFILE" 2>&1
    EXIT_CODE=$?
    echo "$(date '+%Y-%m-%d %H:%M:%S') ⏹  Server gestopt met exit code $EXIT_CODE" >> "$LOGFILE"
    return $EXIT_CODE
}

# Cleanup old log if too large (>5MB)
if [ -f "$LOGFILE" ] && [ $(stat -f%z "$LOGFILE" 2>/dev/null || stat -c%s "$LOGFILE" 2>/dev/null || echo 0) -gt 5242880 ]; then
    tail -100 "$LOGFILE" > "${LOGFILE}.tmp" && mv "${LOGFILE}.tmp" "$LOGFILE"
fi

LAST_RESTART=$(date +%S)

while true; do
    restart_server
    EXIT_CODE=$?
    
    # Clean exit (exit code 0) — don't restart
    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ Server netjes afgesloten. Geen restart."
        break
    fi
    
    # Track restart rate
    NOW=$(date +%s)
    ELAPSED=$((NOW - LAST_RESTART))
    LAST_RESTART=$NOW
    
    if [ $ELAPSED -gt $RESTART_WINDOW ]; then
        RESTART_COUNT=1
    else
        RESTART_COUNT=$((RESTART_COUNT + 1))
    fi
    
    if [ $RESTART_COUNT -ge $MAX_RESTARTS ]; then
        echo "🚨 Te veel crashes ($MAX_RESTARTS in ${RESTART_WINDOW}s). Stoppen om herhaling te voorkomen."
        echo "$LOGFILE bevat details."
        exit 1
    fi
    
    echo "🔄 Server gecrasht (exit $EXIT_CODE). Herstart in 2 seconden... (poging $RESTART_COUNT)"
    sleep 2
done
