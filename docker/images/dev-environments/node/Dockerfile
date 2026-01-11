FROM ubuntu:22.04

ARG DEBIAN_FRONTEND=noninteractive
ARG USER=node
ARG GROUP=node
ARG UID=1000
ARG GID=1000
ARG NODE_MAJOR=20

ENV PATH=/home/${USER}/.local/bin:${PATH}

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    build-essential \
    python3 \
    python3-distutils \
    gzip \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    corepack enable && \
    corepack prepare yarn@stable --activate && \
    corepack prepare pnpm@latest --activate && \
    npm install -g typescript ts-node eslint prettier && \
    npm cache clean --force && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/*

RUN groupadd -g ${GID} ${GROUP} && \
    useradd -m -s /bin/bash -u ${UID} -g ${GID} ${USER} && \
    mkdir -p /workspace && \
    chown -R ${USER}:${GROUP} /workspace /home/${USER}

USER ${USER}
WORKDIR /workspace

ENV NPM_CONFIG_PREFIX=/home/${USER}/.npm-global \
    PATH=/home/${USER}/.npm-global/bin:${PATH}

RUN mkdir -p /home/${USER}/.npm-global && npm config set prefix /home/${USER}/.npm-global

EXPOSE 3000 5173

CMD ["sleep", "infinity"]
