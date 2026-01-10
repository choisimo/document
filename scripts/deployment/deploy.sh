#!/bin/bash

# This script is used to deploy a Node.js app using PM2.
# It prompts for default values and allows custom values.
# It stops the app if running, starts the app, and shows app status.

echo "if error occured, please check the permission of the directory and the file"
echo "or check format of the file"
echo "sudo apt-get install dos2unix"
echo "dos2unix deploy.sh"
echo "chmod +x deploy.sh"

# 1. default values
APP_NAME="node"
APP_DIR="/server/backend"
APP_PORT=3000

# Display default execution method and prompt for alternative
echo "Default execution method:"
echo "App Name: $APP_NAME"
echo "App Directory: $APP_DIR"
echo "App Port: $APP_PORT"
echo "Do you want to use a different configuration? (y/n)"
echo "포트 등 다른 설정을 사용하시겠습니까? (y/n)"
read use_different

if [ "$use_different" == "y" ] || [ "$use_different" == "Y" ]; then
  # Prompt for custom values
  read -p "Enter app name (default: $APP_NAME): " input_name
  APP_NAME=${input_name:-$APP_NAME}

  read -p "Enter app directory (default: $APP_DIR): " input_dir
  APP_DIR=${input_dir:-$APP_DIR}

  read -p "Enter app port (default: $APP_PORT): " input_port
  APP_PORT=${input_port:-$APP_PORT}
fi

# 2. Get values from command line
while getopts "n:d:p:" opt; do
  case $opt in
    n) APP_NAME="$OPTARG" ;;
    d) APP_DIR="$OPTARG" ;;
    p) APP_PORT="$OPTARG" ;;
    \?) echo "Invalid option -$opt" >&2; exit 1 ;;
  esac
done

# 3. Confirm values if not provided through arguments
if [ -z "$APP_NAME" ]; then
  read -p "Enter app name (default: $APP_NAME): " input_name
  APP_NAME=${input_name:-$APP_NAME}
fi

if [ -z "$APP_DIR" ]; then
  read -p "Enter app directory (default: $APP_DIR): " input_dir
  APP_DIR=${input_dir:-$APP_DIR}
fi

if [ -z "$APP_PORT" ]; then
  read -p "Enter app port (default: $APP_PORT): " input_port
  APP_PORT=${input_port:-$APP_PORT}
fi

# 4. Navigate to app directory
echo "Navigating to app directory: $APP_DIR"
if ! cd "$APP_DIR"; then
  echo "Error: Directory $APP_DIR does not exist. Exiting."
  sudo mkdir -p $APP_DIR
  sudo chown -R $USER:$USER $APP_DIR
  if ! cd "$APP_DIR"; then
    echo "Error: Cannot create directory $APP_DIR. Exiting."
    echo "Please create the directory and try again."
    echo "Check if the directory exists and you have permission to create it."
    exit 1
  fi
  exit 1
fi

# 4. Stop app
echo "Stop app: $APP_NAME (if running)"
pm2 stop $APP_NAME || echo "App is not running or not found: $APP_NAME"

# 5. Start app
echo "Start app: $APP_NAME"
PORT="$APP_PORT" pm2 start app.js --name "$APP_NAME" --watch --ignore-watch="node_modules"

# 6. Show app status
echo "Show app status: $APP_NAME"
pm2 show $APP_NAME
