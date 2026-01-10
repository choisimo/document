#!/bin/bash

# Check if the script is run as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root"
    exit 1
fi


# Stop and remove existing Nginx Proxy Manager containers
echo "Stopping and removing existing containers..."
CONTAINERS=("npm_app" "npm_app_1" "npm_db_1")
for CONTAINER in "${CONTAINERS[@]}"; do
    docker stop "$CONTAINER" 2>/dev/null && docker rm "$CONTAINER" 2>/dev/null || echo "$CONTAINER not found. Skipping..."
done

# Stop and remove Docker Compose containers
echo "Stopping and removing Docker Compose containers..."
docker-compose down || true


# Remove old Docker volumes and directories
echo "Removing existing files and directories..."
DIRS=(/docker/npm/data /docker/npm/letsencrypt /docker/npm/data/mysql)
for DIR in "${DIRS[@]}"; do
    if [ -d "$DIR" ]; then
        echo "Removing $DIR..."
        sudo rm -rf "$DIR"
    else
        echo "$DIR does not exist. Skipping..."
    fi
done


# Prompt for MySQL root password
read -sp 'Enter MySQL root password: ' MYSQL_ROOT_PASSWORD
echo 

# Prompt for MySQL host port
read -p 'Enter MySQL host port (default: 13306): ' MYSQL_HOST_PORT
MYSQL_HOST_PORT=${MYSQL_HOST_PORT:-13306} # Use default port if none is provided

# Check if docker-compose is installed
if ! [ -x "$(command -v docker-compose)" ]; then
    echo "docker-compose is not installed. Installing docker-compose..."
    sudo apt-get update
    sudo apt-get install -y docker-compose
fi


# Create necessary directories and set permissions
CREATE_DIRS=(/docker/npm/data /docker/npm/letsencrypt /docker/npm/data/mysql /docker/npm/data/logs)
echo "Creating directories and setting permissions..."
for DIR in "${CREATE_DIRS[@]}"; do
    sudo mkdir -p "$DIR"
    sudo chown -R 1001:1001 "$DIR"
    sudo chmod -R 755 "$DIR"
done

# Ensure ddl_recovery.log exists
DDL_LOG_FILE=/docker/npm/data/mysql/ddl_recovery.log
if [ ! -f "$DDL_LOG_FILE" ]; then
    sudo touch "$DDL_LOG_FILE"
    sudo chown 1001:1001 "$DDL_LOG_FILE"
    sudo chmod 644 "$DDL_LOG_FILE"
    echo "Created $DDL_LOG_FILE."
else
    echo "$DDL_LOG_FILE already exists."
fi


# Ensure Nginx log file exists
NGINX_LOG_FILE=/docker/npm/data/logs/fallback_error.log
echo "Ensuring Nginx log file exists at $NGINX_LOG_FILE..."
if [ ! -f "$NGINX_LOG_FILE" ]; then
    sudo touch "$NGINX_LOG_FILE"
    sudo chown 1001:1001 "$NGINX_LOG_FILE"
    sudo chmod 644 "$NGINX_LOG_FILE"
    echo "Created Nginx log file at $NGINX_LOG_FILE."
else
    echo "$NGINX_LOG_FILE already exists."
fi

sudo chown -R 1001:1001 /docker/npm/data/mysql
sudo chmod -R 755 /docker/npm/data/mysql

# 로그 파일이 있는 디렉토리 및 파일 권한 확인 및 수정
sudo mkdir -p /docker/npm/data/mysql
sudo touch /docker/npm/data/mysql/ddl_recovery.log
sudo chown 1001:1001 /docker/npm/data/mysql/ddl_recovery.log
sudo chmod 644 /docker/npm/data/mysql/ddl_recovery.log

sudo rm -rf /docker/npm/data/*
sudo mkdir -p /docker/npm/data/
sudo chown -R 1001:1001 /docker/npm/data/
sudo chmod -R 755 /docker/npm/data/


# Change to the target directory
cd /docker/npm || { echo "Failed to change directory to /docker/npm. Exiting."; exit 1; }

cd /docker/npm
# Docker Compose configuration
cat <<EOF > docker-compose.yml
version: '3'
services:
    app:
        image: 'jc21/nginx-proxy-manager:latest'
        ports:
            - '80:80'
            - '81:81'
            - '443:443'
        environment:
            DB_MYSQL_HOST: "db"
            DB_MYSQL_USER: "npm"
            DB_MYSQL_PASSWORD: "npm"
            DB_MYSQL_NAME: "npm"
        volumes:
            - /docker/npm/data:/data
            - /docker/npm/letsencrypt:/etc/letsencrypt
    db:
        image: 'jc21/mariadb-aria:latest'
        environment:
            MYSQL_ROOT_PASSWORD: '$MYSQL_ROOT_PASSWORD'
            MYSQL_DATABASE: 'npm'
            MYSQL_USER: 'npm'
            MYSQL_PASSWORD: 'npm'
        ports:
            - '$MYSQL_HOST_PORT:3306'
EOF

if [ $? -ne 0 ]; then
    echo "Failed to create docker-compose.yml file. Exiting."
    exit 1
fi

echo "docker-compose.yml has been created successfully."

# Start the Docker containers
echo "Starting Docker containers... in $(pwd)"
docker-compose up -d
if [ $? -ne 0 ]; then
    echo "Failed to start Docker containers. Exiting."
    exit 1
fi

# Final messages
echo "Docker containers have been started successfully."
echo "You can access the Nginx Proxy Manager at http://localhost:81"
echo "You can access the Nginx Proxy Manager dashboard at http://localhost:81/admin"
echo "MariaDB is accessible at localhost:$MYSQL_HOST_PORT"
echo "Default username and password for Nginx Proxy Manager:"
echo "Username: admin@example.com"
echo "Password: changeme"

docker logs -f npm_db_1 

