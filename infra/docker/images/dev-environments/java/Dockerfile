FROM ubuntu:22.04

ARG DEBIAN_FRONTEND=noninteractive
ARG USER=java
ARG GROUP=java
ARG UID=1000
ARG GID=1000
ARG MAVEN_VERSION=3.9.9
ARG GRADLE_VERSION=8.10.2

ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 \
    MAVEN_HOME=/opt/maven \
    GRADLE_HOME=/opt/gradle \
    PATH=/opt/maven/bin:/opt/gradle/bin:${JAVA_HOME}/bin:/home/${USER}/.local/bin:${PATH}

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    wget \
    git \
    unzip \
    zip \
    build-essential \
    openjdk-21-jdk \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /tmp/downloads

RUN curl -fsSL https://dlcdn.apache.org/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz -o /tmp/downloads/maven.tar.gz && \
    tar -xzf /tmp/downloads/maven.tar.gz -C /opt && \
    ln -s /opt/apache-maven-${MAVEN_VERSION} ${MAVEN_HOME}

RUN curl -fsSL https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip -o /tmp/downloads/gradle.zip && \
    unzip -q /tmp/downloads/gradle.zip -d /opt && \
    ln -s /opt/gradle-${GRADLE_VERSION} ${GRADLE_HOME}

RUN groupadd -g ${GID} ${GROUP} && \
    useradd -m -s /bin/bash -u ${UID} -g ${GID} ${USER} && \
    mkdir -p /workspace && \
    chown -R ${USER}:${GROUP} /workspace /home/${USER}

USER ${USER}
WORKDIR /workspace

ENV SPRING_PROFILES_ACTIVE=dev \
    MAVEN_OPTS="-Xms512m -Xmx2048m" \
    GRADLE_USER_HOME=/home/${USER}/.gradle

RUN mkdir -p /home/${USER}/.m2 /home/${USER}/.gradle && \
    echo "export JAVA_HOME=${JAVA_HOME}" >> /home/${USER}/.bashrc && \
    echo "export PATH=${PATH}" >> /home/${USER}/.bashrc

EXPOSE 8080 5005

CMD ["sleep", "infinity"]
