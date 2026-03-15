
# Flutter + Android SDK development container
# - Ubuntu 22.04 base
# - OpenJDK 17
# - Android SDK (cmdline-tools, platform-tools, build-tools 34)
# - Flutter stable channel with precache (android, linux, web)
# - Non-root user for mounting your project safely

FROM ubuntu:22.04

ARG DEBIAN_FRONTEND=noninteractive

# Versions and paths
ARG ANDROID_SDK_ROOT=/opt/android-sdk
ARG FLUTTER_HOME=/opt/flutter
ARG JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ARG USER=flutter
ARG GROUP=flutter
ARG UID=1000
ARG GID=1000

ENV ANDROID_HOME=${ANDROID_SDK_ROOT} \
    ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT} \
    JAVA_HOME=${JAVA_HOME} \
    FLUTTER_HOME=${FLUTTER_HOME} 

ENV PATH=${FLUTTER_HOME}/bin:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools:${JAVA_HOME}/bin:${PATH}

# Base dependencies and desktop/web build deps for Flutter (linux + web)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    unzip \
    zip \
    xz-utils \
    bash \
    openssh-client \
    # JDK for Android build
    openjdk-17-jdk \
    # Linux desktop build deps
    clang \
    cmake \
    ninja-build \
    pkg-config \
    libgtk-3-dev \
    libglu1-mesa \
    && rm -rf /var/lib/apt/lists/*

# Install Android SDK commandline tools
RUN mkdir -p ${ANDROID_SDK_ROOT}/cmdline-tools /tmp/sdk && \
    cd /tmp/sdk && \
    curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o cmdtools.zip && \
    unzip -q cmdtools.zip -d ${ANDROID_SDK_ROOT}/cmdline-tools && \
    rm -rf ${ANDROID_SDK_ROOT}/cmdline-tools/latest && \
    mv ${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools ${ANDROID_SDK_ROOT}/cmdline-tools/latest && \
    rm -rf /tmp/sdk

# Update SDK, install required packages, and accept licenses
RUN yes | ${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager --licenses || true && \
    ${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager --sdk_root=${ANDROID_SDK_ROOT} --update && \
    ${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin/sdkmanager --sdk_root=${ANDROID_SDK_ROOT} \
      "cmdline-tools;latest" \
      "platform-tools" \
      "platforms;android-34" \
      "build-tools;34.0.0"

# Install Flutter SDK (stable) and precache artifacts
RUN git clone https://github.com/flutter/flutter.git -b stable ${FLUTTER_HOME} && \
    flutter config --no-analytics && \
    flutter precache --android --linux --web && \
    flutter doctor -v

# Create non-root user and set permissions for SDKs and home caches
RUN groupadd -g ${GID} ${GROUP} && \
    useradd -m -s /bin/bash -u ${UID} -g ${GID} ${USER} && \
    mkdir -p /home/${USER}/.android /home/${USER}/.gradle /home/${USER}/.pub-cache /work && \
    chown -R ${USER}:${GROUP} /home/${USER} ${ANDROID_SDK_ROOT} ${FLUTTER_HOME} /work

USER ${USER}
WORKDIR /work

# Cache path for Dart/Flutter packages
ENV PUB_CACHE=/home/${USER}/.pub-cache

# Useful ports when running web/devtools inside container
EXPOSE 8080 9100 5000

# Default shell
CMD ["bash"]

