#!/usr/bin/env bash
# Run once as mooser to set up the VPS environment.
# Must be run via supp if Docker isn't installed yet:
#   ssh supp@165.22.169.31 "sudo bash /tmp/setup-vps.sh"
set -eo pipefail

green() { echo -e "\033[0;32m[✓]\033[0m $1"; }

# Install Docker if not present
if ! command -v docker &>/dev/null; then
  green "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker mooser
  green "Docker installed — mooser added to docker group"
else
  green "Docker already installed"
  usermod -aG docker mooser 2>/dev/null || true
fi

# Create app dir
mkdir -p /home/mooser/app
chown -R mooser:mooser /home/mooser/app
green "App directory ready at /home/mooser/app"

# nginx sudoers (already done but idempotent)
echo 'mooser ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /bin/systemctl reload nginx, /bin/systemctl restart nginx, /bin/cp, /bin/ln' \
  > /etc/sudoers.d/mooser
chmod 440 /etc/sudoers.d/mooser
green "Sudoers configured"

green "VPS setup complete. Log out and back in as mooser for docker group to take effect."
