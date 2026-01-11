# Use a recent Ubuntu LTS version as the base image
FROM ubuntu:22.04

# Set environment variables to prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Update package lists and install essential development tools
# Feel free to add or remove packages based on your needs
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    # Basic utilities
    apt-utils \
    curl \
    wget \
    git \
    zip \
    unzip \
    sudo \
    # Common build tools
    build-essential \
    cmake \
    make \
    # Python development (example)
    python3 \
    python3-pip \
    python3-venv \
    # Node.js development (example - using NodeSource setup)
    # To install a specific Node.js version, change 'node_20.x' accordingly
    # curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    # apt-get install -y nodejs \
    # Other common tools
    vim \
    nano \
    htop \
    man-db \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user for development
# Replace 'developer' with your preferred username
ARG USERNAME=developer
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME && \
    useradd --uid $USER_UID --gid $USER_GID -m $USERNAME --shell /bin/bash && \
    # Add the user to the sudo group
    adduser $USERNAME sudo && \
    # Set passwordless sudo for the user (optional, for convenience in dev)
    echo "$USERNAME ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers.d/$USERNAME && \
    chmod 0440 /etc/sudoers.d/$USERNAME

# Set the working directory for the new user
WORKDIR /home/$USERNAME

# Switch to the non-root user
USER $USERNAME

# Set a default command (optional)
# CMD ["/bin/bash"]

# Expose any ports your application might need (example)
# EXPOSE 3000
# EXPOSE 8000

# --- How to Build and Run ---
#
# 1. Save this file as "Dockerfile" in an empty directory.
#
# 2. Build the Docker image:
#    docker build -t ubuntu-dev-env .
#    (Optional: Pass build arguments for username/UID/GID)
#    docker build --build-arg USERNAME=myuser --build-arg USER_UID=1001 --build-arg USER_GID=1001 -t ubuntu-dev-env .
#
# 3. Run a container from the image:
#    docker run -it --rm \
#      -v $(pwd):/home/$USERNAME/workspace \  # Mount current directory into container's workspace
#      --name my-dev-container \
#      ubuntu-dev-env \
#      /bin/bash
#
#    Explanation of run command options:
#    -it: Interactive terminal
#    --rm: Automatically remove the container when it exits
#    -v $(pwd):/home/$USERNAME/workspace: Mounts the current host directory into /home/$USERNAME/workspace in the container.
#                                       Adjust the host path as needed.
#    --name my-dev-container: Assigns a name to your container.
#    ubuntu-dev-env: The name of the image you built.
#    /bin/bash: Starts a bash shell in the container.
#
# --- Customization Notes ---
# - Add more APT packages:
#   Modify the `apt-get install -y` section to include other tools you need (e.g., openjdk-17-jdk, go, ruby, etc.).
# - Install language-specific version managers:
#   For tools like nvm (Node Version Manager), rvm (Ruby Version Manager), or pyenv (Python Version Manager),
#   you'll typically add RUN commands to download and install them in the user's home directory.
#   Remember to switch to the USER before running user-specific installations.
#   Example for nvm (after USER $USERNAME):
#   USER root # Switch to root temporarily if needed for global setup steps of nvm
#   RUN apt-get update && apt-get install -y curl # Ensure curl is installed
#   USER $USERNAME
#   ENV NVM_DIR /home/$USERNAME/.nvm
#   RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash && \
#       . "$NVM_DIR/nvm.sh" && \
#       nvm install --lts && \
#       nvm alias default lts/*
#   # Add NVM to PATH for subsequent shell sessions
#   ENV PATH $NVM_DIR/versions/node/$(nvm version default)/bin:$PATH
# - Copy configuration files:
#   Use the `COPY` instruction to add your dotfiles (e.g., .bashrc, .vimrc, .gitconfig) into the container.
#   Example:
#   COPY .bashrc /home/$USERNAME/.bashrc
#   COPY .gitconfig /home/$USERNAME/.gitconfig
# - Set default environment variables:
#   Use the `ENV` instruction.
