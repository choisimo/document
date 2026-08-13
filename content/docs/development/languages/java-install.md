# Java Installation Guide

> OpenJDK installation and configuration for development

## Scope and completion criteria

- Package names and available JDK builds depend on distribution release, CPU architecture, enabled repositories, and the date of installation.
- Choose the project's required Java release and vendor before running commands; an LTS label alone does not prove application compatibility.
- Keep `java`, `javac`, build-tool JVM, service JVM, and `JAVA_HOME` on the intended installation rather than switching only one alternative.
- Installation is complete when version output, a compile/run smoke test, and the consuming build or service all report the expected runtime path.

---

## Quick Install

### Ubuntu/Debian

```bash
# Update package list
sudo apt-get update

# Install OpenJDK 17 (LTS)
sudo apt-get install openjdk-17-jdk

# Verify installation
java -version
javac -version
```

### Other Versions

```bash
# Java 11 (LTS)
sudo apt-get install openjdk-11-jdk

# Java 21 (LTS)
sudo apt-get install openjdk-21-jdk

# List available versions
apt-cache search openjdk | grep -E "^openjdk-[0-9]+-jdk"
```

---

## Version Management

### Switch Between Versions

```bash
# List installed Java versions
sudo update-alternatives --config java

# Select by entering the number
# Example output:
#   0    /usr/lib/jvm/java-17-openjdk-amd64/bin/java   1711  auto mode
#   1    /usr/lib/jvm/java-11-openjdk-amd64/bin/java   1111  manual mode
# * 2    /usr/lib/jvm/java-17-openjdk-amd64/bin/java   1711  manual mode

# Also switch javac
sudo update-alternatives --config javac
```

---

## Environment Configuration

### Set JAVA_HOME

```bash
# Find Java installation path
which java
# /usr/bin/java

# Find actual path (follows symlinks)
readlink -f $(which java)
# /usr/lib/jvm/java-17-openjdk-amd64/bin/java

# JAVA_HOME should be the directory above 'bin'
# /usr/lib/jvm/java-17-openjdk-amd64
```

### Configure System-Wide

Edit `/etc/environment`:

```bash
sudo nano /etc/environment
```

Add line:

```bash
JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
```

Apply changes:

```bash
source /etc/environment

# Verify
echo $JAVA_HOME
```

### Configure for Current User

Add to `~/.bashrc` or `~/.zshrc`:

```bash
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"
```

Apply:

```bash
source ~/.bashrc
```

---

## Arch Linux

```bash
# Install OpenJDK 17
sudo pacman -S jdk17-openjdk

# Switch versions
sudo archlinux-java set java-17-openjdk

# List installed
archlinux-java status
```

---

## CentOS/RHEL

```bash
# Install OpenJDK 17
sudo dnf install java-17-openjdk-devel

# Set default
sudo alternatives --config java
```

---

## Verification

```bash
# Check Java version
java -version

# Check compiler version
javac -version

# Check JAVA_HOME
echo $JAVA_HOME

# Test compilation
echo 'public class Test { public static void main(String[] args) { System.out.println("Hello!"); } }' > Test.java
javac Test.java
java Test
rm Test.java Test.class
```

---

## Common Paths

| Distribution | JAVA_HOME Path |
|--------------|----------------|
| Ubuntu/Debian | `/usr/lib/jvm/java-17-openjdk-amd64` |
| Arch Linux | `/usr/lib/jvm/java-17-openjdk` |
| CentOS/RHEL | `/usr/lib/jvm/java-17-openjdk` |

---

## Related Documentation

- [GCC Installation](gcc.md)
- [Spring Boot Guide](../../databases/jpa/overview.md)
