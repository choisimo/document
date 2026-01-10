# Created At: 2022-01-01 12:00:00
if [ -d "/usr/local/node-v21.6.1" ]; then
    echo "Node.js v21.6.1 is already installed."
    exit 0
fi
# Check if the script is run as root
if [ ! -u "$(whoami)" ]; then
    echo "Please run this script as root."
    exit 1
fi
sudo apt-get update

sudo apt-get install wget
sudo apt-get remove --purge nodejs npm
sudo wget https://nodejs.org/dist/v21.6.1/node-v21.6.1-linux-x64.tar.xz
tar -xvf node-v21.6.1-linux-x64.tar.xz
sudo mv node-v21.6.1-linux-x64 /usr/local/node-v21.6.1
sudo ln -s /usr/local/node-v21.6.1/bin/node /usr/bin/node
sudo ln -s /usr/local/node-v21.6.1/bin/npm /usr/bin/npm
sudo npm install -g serve
export PATH=$PATH:/usr/local/node-v21.6.1/bin
echo 'export PATH=$PATH:/usr/local/node-v21.6.1/bin' >> ~/.bashrc
source ~/.bashrc
