#!/bin/sh
set -e

# Default to 1000:1000 if not specified
USER_ID=${PUID:-1000}
GROUP_ID=${PGID:-1000}

echo "Starting with UID: $USER_ID, GID: $GROUP_ID"

# Update the nodejs user's UID and GID if they differ from defaults
if [ "$USER_ID" != "1001" ] || [ "$GROUP_ID" != "1001" ]; then
    echo "Updating nodejs user to UID: $USER_ID, GID: $GROUP_ID"
    
    # Modify the existing group's GID
    if [ "$GROUP_ID" != "1001" ]; then
        sed -i "s/:1001:/:$GROUP_ID:/" /etc/group
    fi
    
    # Modify the existing user's UID and GID
    if [ "$USER_ID" != "1001" ] || [ "$GROUP_ID" != "1001" ]; then
        sed -i "s/nodejs:x:1001:1001:/nodejs:x:$USER_ID:$GROUP_ID:/" /etc/passwd
    fi
    
    # Fix ownership of app files
    chown -R "$USER_ID:$GROUP_ID" /app
fi

# Ensure config directory has correct permissions
if [ -d /config ]; then
    chown -R "$USER_ID:$GROUP_ID" /config
fi

# Switch to nodejs user and run the application
exec su-exec "$USER_ID:$GROUP_ID" node src/index.js
