# VS Code Plugins & Extensions

> Example VS Code extensions to evaluate for a specific development workflow

---

## Scope and Selection Criteria

- **Scope:** Extension availability, identifiers, pricing, licenses, trust, telemetry, and compatibility depend on the VS Code and Marketplace versions. This is a curated example list, not a universal required set.
- **Assumptions:** Select extensions for a named language, repository, remote environment, formatter and linter policy. Avoid overlapping formatters or language servers unless precedence is explicit.
- **Evidence and uncertainty:** Popularity and a short description do not establish security, maintenance quality, or productivity benefit. Review publisher identity, permissions, release history, workspace trust, and measured startup or CPU impact.
- **Failure and completion:** Test conflicts, untrusted-workspace behavior, remote support, formatting output, uninstall and settings rollback. A selection is complete when the repository workflow works without duplicated diagnostics or unacceptable resource use.

---

## Directory Navigation

### Material Icon Theme

Provides clear, intuitive directory and file icons for better visual organization.

![Material Icon Theme](https://github.com/choisimo/cli-commands/assets/150008602/42f67d6b-34e2-4ecd-969b-fc304671cd16)

**Installation:**
```
ext install PKief.material-icon-theme
```

---

## Candidate Extensions

### Development Essentials

| Extension | Description | Command |
|-----------|-------------|---------|
| **GitLens** | Git supercharged | `ext install eamodio.gitlens` |
| **Prettier** | Code formatter | `ext install esbenp.prettier-vscode` |
| **ESLint** | JavaScript linter | `ext install dbaeumer.vscode-eslint` |
| **Docker** | Docker support | `ext install ms-azuretools.vscode-docker` |

### Language Support

| Extension | Description | Command |
|-----------|-------------|---------|
| **Python** | Python IntelliSense | `ext install ms-python.python` |
| **Java Extension Pack** | Java support | `ext install vscjava.vscode-java-pack` |
| **Go** | Go language support | `ext install golang.go` |

### Productivity

| Extension | Description | Command |
|-----------|-------------|---------|
| **Remote - SSH** | Remote development | `ext install ms-vscode-remote.remote-ssh` |
| **Live Server** | Local dev server | `ext install ritwickdey.LiveServer` |
| **Thunder Client** | REST API client | `ext install rangav.vscode-thunder-client` |

---

## Settings Recommendations

### User Settings (settings.json)

```json
{
  "editor.fontSize": 14,
  "editor.fontFamily": "'JetBrains Mono', 'Fira Code', monospace",
  "editor.fontLigatures": true,
  "editor.formatOnSave": true,
  "editor.minimap.enabled": false,
  "editor.tabSize": 2,
  "workbench.iconTheme": "material-icon-theme",
  "terminal.integrated.fontSize": 13,
  "files.autoSave": "afterDelay"
}
```

---

## Related Documentation

- [Code Server Setup](code-server.md)
