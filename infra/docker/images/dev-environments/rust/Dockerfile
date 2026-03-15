FROM ubuntu:22.04

ARG DEBIAN_FRONTEND=noninteractive
ARG USER=rust
ARG GROUP=rust
ARG UID=1000
ARG GID=1000
ARG RUST_VERSION=1.82.0

ENV PATH=/home/${USER}/.cargo/bin:${PATH}

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

RUN curl https://sh.rustup.rs -sSf | sh -s -- -y --default-toolchain ${RUST_VERSION} --profile minimal

RUN groupadd -g ${GID} ${GROUP} && \
    useradd -m -s /bin/bash -u ${UID} -g ${GID} ${USER} && \
    mkdir -p /workspace && \
    chown -R ${USER}:${GROUP} /workspace /home/${USER}

USER ${USER}
WORKDIR /workspace

RUN rustup component add clippy rustfmt && \
    cargo install cargo-watch cargo-audit cargo-edit

ENV RUST_BACKTRACE=1

EXPOSE 8081

CMD ["sleep", "infinity"]
