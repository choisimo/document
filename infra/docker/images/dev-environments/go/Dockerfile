FROM ubuntu:22.04

ARG DEBIAN_FRONTEND=noninteractive
ARG USER=go
ARG GROUP=go
ARG UID=1000
ARG GID=1000
ARG GO_VERSION=1.23.1

ENV GOPATH=/home/${USER}/go \
    GOROOT=/usr/local/go \
    PATH=/usr/local/go/bin:/home/${USER}/go/bin:${PATH}

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    build-essential \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz -o /tmp/go.tar.gz && \
    tar -C /usr/local -xzf /tmp/go.tar.gz && \
    rm /tmp/go.tar.gz

RUN groupadd -g ${GID} ${GROUP} && \
    useradd -m -s /bin/bash -u ${UID} -g ${GID} ${USER} && \
    mkdir -p /workspace ${GOPATH}/bin ${GOPATH}/pkg ${GOPATH}/src && \
    chown -R ${USER}:${GROUP} /workspace /home/${USER} ${GOPATH}

USER ${USER}
WORKDIR /workspace

RUN go install golang.org/x/tools/gopls@latest && \
    go install github.com/go-delve/delve/cmd/dlv@latest && \
    go install github.com/securego/gosec/v2/cmd/gosec@latest

ENV GO111MODULE=on

EXPOSE 8080

CMD ["sleep", "infinity"]
