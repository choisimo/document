#!/bin/bash

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root"
    exit 1
fi

# Get userId input
echo -n "Enter userId: "
read userId

# Update package list
sudo apt-get update

# Create directory for movie-app and set permissions
sudo mkdir -p /opt/movie-app
sudo chown -R "$userId:$userId" /opt/movie-app

# Check if Docker is installed
if ! [ -x "$(command -v docker)" ]; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! [ -x "$(command -v docker-compose)" ]; then
    echo "Docker Compose is not installed. Installing Docker Compose..."
    sudo apt-get install -y docker-compose
fi

# Check if Git is installed
if ! [ -x "$(command -v git)" ]; then
    echo "Git is not installed. Installing Git..."
    sudo apt-get install -y git
fi

sudo chown -R "$userId:$userId" /opt/movie-app
# Navigate to the cloned directory
cd /opt/movie-app || exit

git clone --depth=1 https://gitlab.com/rogs/yams.git /opt/movie-app


# Run the YAMS installation script
echo "Running the YAMS installation script..."
chmod +x /opt/movie-app/install.sh
bash /opt/movie-app/install.sh
