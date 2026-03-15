FROM ubuntu:22.04

ARG DEBIAN_FRONTEND=noninteractive
ARG USER=python
ARG GROUP=python
ARG UID=1000
ARG GID=1000

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONUNBUFFERED=1 \
    VIRTUAL_ENV=/opt/venv \
    PATH=/opt/venv/bin:/home/${USER}/.local/bin:${PATH}

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    git \
    curl \
    wget \
    ca-certificates \
    libopenblas-dev \
    libomp-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv ${VIRTUAL_ENV} && \
    ${VIRTUAL_ENV}/bin/pip install --upgrade pip setuptools wheel

RUN ${VIRTUAL_ENV}/bin/pip install --no-cache-dir \
    numpy \
    scipy \
    pandas \
    scikit-learn \
    matplotlib \
    seaborn \
    jupyterlab \
    ipykernel \
    tensorflow

RUN ${VIRTUAL_ENV}/bin/pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    torch \
    torchvision \
    torchaudio

RUN groupadd -g ${GID} ${GROUP} && \
    useradd -m -s /bin/bash -u ${UID} -g ${GID} ${USER} && \
    mkdir -p /workspace && \
    chown -R ${USER}:${GROUP} /workspace /home/${USER} /opt/venv

USER ${USER}
WORKDIR /workspace

ENV MPLCONFIGDIR=/home/${USER}/.config/matplotlib

EXPOSE 8888 6006

CMD ["sleep", "infinity"]
