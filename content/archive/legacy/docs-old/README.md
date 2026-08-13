# Legacy documentation index

This directory is a historical snapshot of an earlier documentation layout. It is retained for migration traceability, not as the canonical navigation entry point. Paths in this index may have moved or may describe software versions that are no longer supported.

## Scope

| Directory | Historical subject area |
| --- | --- |
| `ai-ml/` | Embeddings, similarity, and recommendation-system notes |
| `databases/` | Database installation, Redis, JPA, and QueryDSL notes |
| `development/` | Editors, version control, containers, languages, and servers |
| `infrastructure/` | Virtualization, networks, storage, synchronization, and monitoring |
| `security/` | SSH, access control, VPN, authentication, and Zero Trust notes |
| `tools/` | Terminal, automation, scheduling, and remote-access utilities |

## How to use an archived document

1. Treat commands, package names, ports, and configuration keys as a record of the document's original environment.
2. Identify the target operating system, application version, and deployment topology before running a command.
3. Resolve the corresponding current document from the repository's root index and migration map.
4. Compare the archived procedure with current vendor documentation and local configuration.
5. Run changes in a disposable environment first, then record the observed output and rollback path.

An archived procedure is not considered current merely because its commands still execute. Successful migration requires a mapped current destination, preserved source history, and a checked replacement link.
