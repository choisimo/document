#!/bin/bash

# This script installs Docker on an Ubuntu system.
echo "Starting Docker installation"

# Check for SUDO privileges
if [ "$(id -u)" != "0" ]; then
    echo "This script must be run as root. Use SUDO."
    exit 1
fi

# 1. Update package list
echo "Updating package list..."
apt update -y

# 2. Install packages required for Docker
echo "Installing packages required for Docker..."
apt install -y apt-transport-https ca-certificates curl software-properties-common

# 3. Add Docker GPG key
echo "Adding Docker GPG key..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 4. Set up Docker repository
echo "Setting up Docker repository..."
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list

# 5. Update package list
echo "Updating Docker package list..."
apt update -y

# 6. Install Docker engine, CLI, and containerd
echo "Installing Docker engine, CLI, and containerd..."
apt install -y docker-ce docker-ce-cli containerd.io

# 7. Start and enable Docker service
echo "Starting and enabling Docker service..."
systemctl start docker
systemctl enable docker

# 8. Add current user to Docker group
echo "Adding current user to Docker group..."
if [ "$USER" = "root" ]; then
    echo "The root account does not need to be added to the docker group."
else
    usermod -aG docker "$USER"
    echo "User added to Docker group. Log out and log back in to apply."
fi

echo "Docker installation and setup complete."
