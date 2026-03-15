## download Node.js
    https://nodejs.org/ko/
#### node version check
    node -v
#### npm version check
    npm -v


## install react
    npx create-react-app ${project_name}

## How to Build
    npm run build

# Sever setting
## install nvm (install nodejs using nvm)
    wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
    // if nvm command not work, type source ~/.bashrc
    nvm --version
    nvm ls-remote -lts
    nvm install v20.9.0 // 24.04.06 based 
    node --version
    npm install -g npm@latest

    sudo apt-get update
    sudo apt-get install nodejs npm -y
    sudo npm install -g server

    curl -fsSL https://deb.nodesource.com/setup_current.x | sudo -E bash -
    sudo apt-get install -y nodejs

    
## make server
    npm install -g serve

## run build 
    npx serve -s build -l ${port} > react.log 2>&1 &
