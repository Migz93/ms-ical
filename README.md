# Microsoft iCal

<p align="center">
  <img src="repo_assets/Icon.svg" alt="MS iCal Logo" width="100" height="100"/>
</p>

[![GitHub Activity][commits-shield]][commits]
[![License][license-shield]][license]
[![Project Maintainer][maintainer-shield]][user_profile]
[![Buy me a coffee][buymecoffeebadge]][buymecoffee]

MS iCal is a self-hosted application that connects to your Microsoft calendars and publishes them as iCal feeds that can be subscribed to by other calendar applications.
Although Microsoft does allow iCal links to be created, it seems it does not allow it for "Your Family" calendar, which is what this application is designed for.

![example][exampleimg]

## Features

- **Microsoft Calendar Access** - Connect to your Microsoft account and access all your calendars
- **Web Calendar View** - View your events in a clean, modern calendar interface
- **iCal Feed Publishing** - Generate subscription URLs for your calendars
- **Multi-Calendar Support** - Select which calendars to include in each feed
- **Automatic Refresh** - Feeds update automatically at configurable intervals
- **Secure** - Tokenized feed URLs with encrypted credentials

## Getting Started

> **Note**: The `/config` directory is mapped to where you want the database and application data to be saved. This ensures your data persists even when the container is updated or removed.

### Quick Start with Docker

```bash
# Create a directory for persistent data
mkdir -p /opt/ms-ical

# Run the container
docker run -d \
  --name ms-ical \
  -p 5600:5600 \
  -v /opt/ms-ical:/config \
  -e PUID=1000 \
  -e PGID=1000 \
  ghcr.io/migz93/ms-ical:latest
```

Then access the application at http://docker-host-ip:5600

> **Tip**: Set `PUID` and `PGID` to match your user ID to avoid permission issues. Run `id -u` and `id -g` to find your UID and GID. If not specified, defaults to 1000:1000.

### Docker Compose

Create a [`docker-compose.yml`](docker-compose.yml) file:

```yaml
version: '3.8'

services:
  app:
    image: ghcr.io/migz93/ms-ical:latest
    container_name: ms-ical
    network_mode: bridge
    ports:
      - "5600:5600"
    volumes:
      - /opt/ms-ical:/config
    environment:
      - PUID=1000  # Set to your user's UserID
      - PGID=1000  # Set to your user's GroupID
    restart: unless-stopped
```

Then run:

```bash
docker-compose up -d
```

For setup instructions, usage guide & troubleshooting, check the wiki.

## Security Notice

MS iCal was developed with the use of AI technologies (Windsurf with Claude 4.5 Sonnet). We can't verify that best practices were followed nor that the code is free of vulnerabilities.
Therefore we recommend:

- **Local Network Only**: For optimal security, run MS iCal on your local network rather than exposing it directly to the internet
- **Use VPN**: If remote access is needed, consider using a VPN
- **Use HTTPS**: If exposing to the internet, use a reverse proxy with HTTPS (Caddy, nginx, etc.)
- **Regular Backups**: Keep regular backups of your database file located in the config directory
- **Updates**: Check for updates regularly as security improvements may be released

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

***

[buymecoffee]: https://www.buymeacoffee.com/Migz93
[buymecoffeebadge]: https://img.shields.io/badge/buy%20me%20a%20coffee-donate-yellow.svg?style=for-the-badge
[commits-shield]: https://img.shields.io/github/commit-activity/y/migz93/ms-ical.svg?style=for-the-badge
[commits]: https://github.com/migz93/ms-ical/commits/main
[exampleimg]: https://raw.githubusercontent.com/migz93/ms-ical/main/repo_assets/Example.png
[license]: https://github.com/migz93/ms-ical/blob/main/LICENSE
[license-shield]: https://img.shields.io/github/license/custom-components/integration_blueprint.svg?style=for-the-badge
[maintainer-shield]: https://img.shields.io/badge/maintainer-Migz93-blue.svg?style=for-the-badge
[user_profile]: https://github.com/migz93