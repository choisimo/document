# how to install code-server(vscode server) on Ubuntu 

## download
    curl -fsSL https://code-server.dev/install.sh | sh

## execute code-server
    code-server

## edit settings

    vim ~/.config/code-server/config.yaml

    bind-addr: 0.0.0.0:${port}
    auth: password
    password: ${password}
    cert: false

# service

    sudo systemctl enable --now code-server@${username}
## check is working 
    sudo systemctl list-units code-server*
## stop service
    sudo systemctl stop code-server@${username}.service
## disable
    sudo systemctl disable code-server@{username}