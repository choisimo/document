# DevOps and Linux Internals: Under the Hood

> Synthesized from: comp(36/103-178) DevOps, Linux administration, CI/CD, shell scripting, Ansible, Terraform, monitoring, and infrastructure automation references including: Wieers *Ansible for DevOps*, Morris *Infrastructure as Code*, Turnbull *The Docker Book*, monitoring/alerting stacks, and the full Linux systems administration curriculum.

---

## 1. Linux Systemd Internals — Unit Activation Graph

systemd is PID 1 on modern Linux. It parallelizes service startup via dependency resolution and socket activation, replacing sequential SysV init scripts.

### Unit Dependency Graph and Activation

```mermaid
flowchart TD
    K["kernel\n(handoff to /sbin/init = systemd)"] --> SYS_INIT["systemd (PID 1)\nsocket: /run/systemd/private/init.socket"]
    
    SYS_INIT --> SYSINIT["sysinit.target\n(device, mountall, swap, time sync)"]
    SYSINIT --> BASIC["basic.target\n(sockets, paths, timers ready)"]
    BASIC --> MULTI["multi-user.target\n(all daemon services)"]
    MULTI --> GRAPHICAL["graphical.target\n(if display manager present)"]
    
    BASIC --> SSHD["sshd.socket\n(socket activation: open port 22\nbefore sshd process starts)"]
    SSHD -->|"first connection arrives"| SSHD_SVC["sshd.service\n(process spawned on demand)"]
    
    BASIC --> NGINX["nginx.service\nAfter=network.target\nRequires=network.target"]
    BASIC --> POSTGRES["postgresql.service\nAfter=network.target syslog.target"]
```

**Socket activation**: systemd creates the listening socket (`bind()`, `listen()`) BEFORE starting the service. Service inherits pre-opened file descriptor via `SD_LISTEN_FDS`. Connections queue in kernel backlog until service ready. Zero dropped connections during restarts.

### Cgroup Integration — Resource Control

```mermaid
flowchart TD
    subgraph Cgroup_Tree["cgroup v2 hierarchy (/sys/fs/cgroup)"]
        ROOT["/\nCPU: unlimited\nMem: unlimited"]
        ROOT --> SYSTEM["system.slice/"]
        ROOT --> USER["user.slice/"]
        ROOT --> MACHINE["machine.slice/ (VMs/containers)"]
        SYSTEM --> NGINX_CG["nginx.service\ncpu.weight=100\nmemory.max=512M\nio.weight=50"]
        SYSTEM --> PG_CG["postgresql.service\ncpu.weight=500\nmemory.max=4G"]
        USER --> SESSION["user-1000.slice/\nsession-1.scope"]
    end
```

systemd maps each service to a cgroup slice. `systemctl set-property nginx.service CPUQuota=50%` → writes `50000 100000` to `cpu.max` file in cgroup → kernel CFS bandwidth controller enforces quota.

---

## 2. Linux Package Management Internals

### RPM/DNF — Transaction Processing

```mermaid
sequenceDiagram
    participant User
    participant DNF
    participant Repo
    participant RPM_DB

    User->>DNF: dnf install nginx
    DNF->>Repo: Fetch repomd.xml, primary.xml.zst\n(package metadata: name, version, deps, file list)
    DNF->>DNF: Dependency resolution\nSAT solver (libsolv)\nBuilds dependency DAG\nChecks conflicts
    DNF->>User: Transaction preview: install nginx + deps
    User->>DNF: confirm
    DNF->>Repo: Download nginx-1.24.0.rpm\nVerify GPG signature (gpgcheck=1)
    DNF->>RPM_DB: rpm --install nginx\n1. Unpack CPIO archive to temp dir\n2. Run %pre scriptlet (bash)\n3. Move files to filesystem (atomic rename)\n4. Run %post scriptlet\n5. Update /var/lib/rpm/rpmdb.sqlite
```

**RPM CPIO archive**: `.rpm` = lead (magic) + signature (MD5/GPG over header+payload) + header (metadata tags) + payload (CPIO archive, xz/zstd compressed). Each file in CPIO has: path, size, mode, uid/gid, checksum.

### APT/dpkg — Dependency Resolution

```mermaid
flowchart TD
    A["apt install nginx"] --> B["Parse /var/lib/apt/lists/\n(Packages.xz from each repo)\nBuilds in-memory package graph"]
    B --> C["Dependency solver (EDSP protocol)\nGutenberg/CUDF solver\nOutputs ordered install/remove/upgrade list"]
    C --> D["Download .deb packages\nVerify SHA256 against Release file\nVerify Release GPG signature"]
    D --> E["dpkg --install nginx.deb\n1. Unpack to temp dir\n2. Run preinst maintainer script\n3. Move files to filesystem\n4. Configure: postinst script\n5. Update /var/lib/dpkg/status"]
```

---

## 3. Ansible Internals — Task Execution Engine

### Control Flow and Module Execution

```mermaid
sequenceDiagram
    participant Ansible as Ansible Control Node
    participant SSH as SSH
    participant Target as Target Host

    Ansible->>Ansible: Parse playbook YAML\nBuild task list\nResolve variables (Jinja2 evaluation)
    Ansible->>SSH: Connect (multiplexed ControlMaster)
    SSH->>Target: Copy module file to /tmp/ansible_xxx.py\n+ json args file
    Target->>Target: python3 /tmp/ansible_xxx.py\nRead args, execute task logic\nReturn JSON: {changed, msg, diff, ...}
    Target-->>Ansible: JSON result via stdout
    Ansible->>Ansible: Parse result\nif changed: notify handlers\nif failed: handle error_handling
    Ansible->>SSH: rm -f /tmp/ansible_xxx.py (cleanup)
```

**Mitogen backend** (2-3× faster): Instead of copying Python script per task, Mitogen forks a Python interpreter on the target over SSH once and reuses it for all tasks in the play. Saves the Python startup (~50ms) and file copy overhead per task.

**Fact gathering**: `setup` module runs `facter`-like system introspection: reads `/proc`, `dmidecode`, `ip addr`, `df`, `uname` → returns JSON facts dict → stored in `hostvars[hostname]`.

### Jinja2 Template Rendering in Ansible

```
Variable precedence (lowest to highest):
role defaults → inventory file vars → inventory group_vars → inventory host_vars
→ playbook group_vars → playbook host_vars → host facts
→ play vars → task vars → extra vars (-e) → registered vars
```

```mermaid
flowchart LR
    A["Template: 'nginx listens on {{ port }}'\nwhere port is in inventory"] --> B["Jinja2 Environment\nLexer: tokenize {{ }}, {% %}, {# #}\nParser: AST nodes"]
    B --> C["Variable lookup:\nTemplate.render(context_dict)\nUnified var dict: merged precedence stack"]
    C --> D["Output: 'nginx listens on 8080'"]
```

---

## 4. Terraform State and Plan Internals

### Infrastructure as Code — State Machine

```mermaid
flowchart TD
    TF["main.tf\nresource aws_instance web {\n  ami = var.ami_id\n  instance_type = t3.micro\n}"]
    
    TF --> PLAN["terraform plan\n1. Parse HCL → internal resource graph\n2. Load terraform.tfstate (current state)\n3. Provider.read() → actual cloud state\n4. Diff: desired vs actual\n5. Execution plan: +create, ~update, -destroy"]
    
    PLAN --> APPLY["terraform apply\n1. Execute plan in dependency order\n2. Call provider API for each resource\n3. Write result to terraform.tfstate\n4. State stored: local file or S3/Consul backend"]
```

**State locking**: S3 backend uses DynamoDB table for distributed lock. `terraform apply` acquires lock → runs → releases. Prevents concurrent applies to same infrastructure (split-brain risk).

**Resource graph**: Dependencies resolved via `depends_on` + implicit refs. `aws_db_instance.db` references `aws_vpc_subnet.private.id` → subnet must be created before DB. Terraform parallelizes independent resource operations.

---

## 5. CI/CD Pipeline Internals

### Jenkins Pipeline Execution Model

```mermaid
sequenceDiagram
    participant Dev
    participant Git
    participant Jenkins
    participant Agent
    participant Registry

    Dev->>Git: git push feature/auth
    Git->>Jenkins: Webhook POST /github-webhook/\n{event: push, ref: refs/heads/feature/auth}
    Jenkins->>Jenkins: MultiBranch pipeline scan\nFind Jenkinsfile in branch
    Jenkins->>Agent: Allocate agent (label=docker)\nvia Remoting protocol (JNLP/WebSocket)
    Agent->>Agent: Pipeline Stage: Checkout\ngit clone --depth=1 $GIT_URL
    Agent->>Agent: Stage: Build\ndocker build -t app:$GIT_COMMIT .\n(BuildKit layer cache from registry)
    Agent->>Agent: Stage: Test\ndocker run app:$GIT_COMMIT pytest
    Agent->>Registry: docker push app:$GIT_COMMIT
    Agent-->>Jenkins: Stage results, artifacts
    Jenkins->>Dev: Notify: build #123 SUCCESS
```

**Declarative pipeline YAML → Groovy**: Jenkins DSL parsed as Groovy scripts. `pipeline {}`, `stages {}`, `steps {}` are method calls on `WorkflowScript`. Each step executes in agent workspace directory. Environment variables scoped per stage.

---

## 6. Linux Process and Signal Internals

### fork()/exec() Implementation Detail

```mermaid
flowchart TD
    PARENT["Parent Process\nPID=100\ntask_struct, mm_struct, files_struct"] 
    
    PARENT -->|"fork()"| CHILD["Child Process\nPID=101\nCopy of parent's task_struct\nmm_struct SHARED (CoW)\nfiles_struct SHARED (refcnt++)"]
    
    CHILD -->|"execve('/bin/nginx', args, env)"| EXEC["1. Load ELF: parse headers\n2. mmap .text, .data, .bss segments\n3. Set up stack: argc, argv, envp, aux vector\n4. Jump to ELF entry point (ld.so or _start)\n5. libc init: malloc arena, stdio\n6. main() called"]
```

**Copy-on-Write (CoW)**: After fork(), both parent and child share same physical pages (marked read-only). On first write to shared page: page fault → kernel allocates new page, copies content, remaps PTE for writing process. Only pages actually modified are duplicated.

### Signal Delivery

```mermaid
flowchart TD
    A["kill(pid, SIGTERM)"] --> B["sys_kill:\nvalidate permissions (uid check)\nSend signal: find task_struct by pid\nsignal_wake_up(task, sig)"]
    
    B --> C["Signal pending in task->pending.signal bitmask\n(bit 15 for SIGTERM)"]
    
    C -->|"next kernel-to-user transition\n(syscall return, interrupt return)"| D["do_signal():\ncheck pending signals\nif SIGTERM and no handler installed: default action = TERM"]
    
    D -->|"Handler registered with sigaction()"| E["Build sigframe on user stack\nsave {regs, mask} in ucontext\nJump to signal handler address\nrestorer: call rt_sigreturn() on return"]
    E --> F["rt_sigreturn():\nRestore {regs, mask} from sigframe\nResume interrupted user code"]
```

**Signal mask**: `sigprocmask(SIG_BLOCK, &set, NULL)` sets `task->blocked` bitmask. Pending signals in `task->blocked` are deferred until unblocked. `SIGKILL` and `SIGSTOP` cannot be blocked or caught.

---

## 7. Linux Shell Internals — Bash Execution

### Command Parsing and Expansion Order

```mermaid
flowchart TD
    A["Input: echo \"Hello $USER, $(date)\" > /tmp/out.txt"]
    A --> B["Tokenization:\nReserved words, operators, words\nQuote removal context tracking"]
    B --> C["Parsing: command tree\n{simple_cmd echo, args [...], redirect stdout}"]
    C --> D["Expansion (in order):\n1. Brace expansion: {a,b}c → ac bc\n2. Tilde: ~/foo → /home/user/foo\n3. Parameter: $USER → 'alice'\n4. Command subst: $(date) → fork+exec date\n5. Arithmetic: $((1+2)) → 3\n6. Word splitting on IFS=\\t\\n (after unquoted expansions)\n7. Glob/pathname: *.txt → file list\n8. Quote removal: strip remaining quotes"]
    D --> E["Execute: fork()+execve('echo', args)\nRedirect: open('/tmp/out.txt', O_WRONLY|O_CREAT|O_TRUNC)\ndup2(fd, STDOUT_FILENO)\nexecve('echo', ['echo', 'Hello alice, Thu Feb ...'], envp)"]
```

**Pipe internals**: `cmd1 | cmd2` → `pipe(fds)` → fork two children → child1: `dup2(fds[1], 1)` (write end → stdout) → `execve(cmd1)` → child2: `dup2(fds[0], 0)` (read end → stdin) → `execve(cmd2)`. Kernel pipe buffer: 64KB (adjustable via `fcntl(fd, F_SETPIPE_SZ, n)`).

---

## 8. Linux Monitoring Stack — Prometheus/Grafana Internals

### Metrics Collection Architecture

```mermaid
flowchart TD
    subgraph Target_Process
        EXP["Prometheus Exporter\n(process_exporter, node_exporter, etc.)\nHTTP GET /metrics\nOpenMetrics text format:\n# HELP cpu_seconds_total ...\ncpu_seconds_total{mode='idle'} 12345.6"]
    end

    subgraph Prometheus
        SCRAPE["Scrape Loop\nevery 15s (configurable)\nHTTP GET target:9100/metrics\nParse text → samples"]
        TSDB["TSDB (Time Series DB)\n2-hour in-memory chunks\nWAL (write-ahead log)\nCompaction → on-disk blocks\n.../data/{wal, 01HTXXXX/chunks}"]
        SCRAPE --> TSDB
    end

    subgraph Grafana
        GF["PromQL query execution\nvia /api/v1/query_range\nHTTP to Prometheus"]
        GF --> RENDER["Panel rendering\nCanvas/SVG time series\nDataFrame format"]
    end

    EXP --> SCRAPE
    TSDB --> GF
```

### TSDB Chunk Format

```
Chunk (2-hour window for one time series):
Header: encoding=XOR_FLOAT64, num_samples
Sample 0: t0=unix_ms, v0=float64 (raw)
Sample 1: Δt1=(t1-t0), Δv using XOR delta-of-delta encoding
...
Compression: typically 1.37 bytes/sample vs 16 bytes raw
```

**XOR delta encoding** (Gorilla compression): First sample: full 64-bit float. Subsequent samples: XOR with previous value. If XOR=0 (same value): 1 bit. Else: control bits + XOR significant bits. Achieves 10-100× compression for slowly-changing metrics.

---

## 9. Log Pipeline Internals — Fluentd/ELK Stack

```mermaid
flowchart TD
    APP["Application\nwrites to stdout/file"] --> FILEBEAT["Filebeat Agent\nTail log files (inotify/kqueue)\nLine buffering → registry: last read position"]
    
    FILEBEAT --> LOGSTASH["Logstash Pipeline\nInput: beats plugin (TCP/TLS)\nFilter: grok parsing:\n'%{TIMESTAMP_ISO8601:time} %{LOGLEVEL:level} %{GREEDYDATA:msg}'\ngeoip, mutate, date plugins\nOutput: elasticsearch bulk API"]
    
    LOGSTASH --> ES["Elasticsearch\nPrimary shard: inverted index\n{token→[docID, position, ...]} Lucene segment\nTranslog (WAL) → fsync every 5s\nSegment merge (background)"]
    
    ES --> KIBANA["Kibana\nQuery DSL → Lucene query\nAggregation: terms, date_histogram\nKibana Lens visualization"]
```

**Logstash grok**: Named regex patterns. `%{TIMESTAMP_ISO8601:time}` expands to complex datetime regex. Compiled to Java Pattern. Match → extract named groups → add to event map → pass to next filter.

---

## 10. Infrastructure Automation — Packer and Immutable Images

```mermaid
sequenceDiagram
    participant Packer
    participant Cloud as AWS/GCP
    participant Ansible

    Packer->>Cloud: CreateInstance (builder: ami)\nstart base AMI
    Cloud-->>Packer: instance running, SSH ready
    Packer->>Ansible: ansible-playbook -i dynamic_inv app-setup.yml\n(over SSH to temp instance)
    Ansible->>Cloud: Install packages, configure app,\nbake config files, run tests
    Ansible-->>Packer: provisioning complete
    Packer->>Cloud: CreateImage from instance\nCreate snapshot of all EBS volumes
    Cloud-->>Packer: ami-0abc123 ready
    Packer->>Cloud: TerminateInstance (cleanup)
    Note over Packer,Cloud: Golden AMI immutable artifact\nDeploy via ASG launch template\nnever SSH into running instances
```

**Immutable infrastructure**: AMI baked once with all dependencies. Auto Scaling Group launches instances from AMI. On deploy: new AMI → update launch template → rolling replace (old instances terminated, new launched). No config drift, reproducible deployments.

---

## 11. Linux Performance Analysis — perf and eBPF

### perf sampling internals

```mermaid
flowchart TD
    A["perf record -F 99 -g ./app"] --> B["perf_event_open() syscall\nSetup PMU (Performance Monitoring Unit) event:\nINSTR_RETIRED or CPU_CYCLES\nSample frequency: 99 Hz"]
    B --> C["PMU counter overflow → NMI interrupt\nIn NMI handler:\n1. Read CPU registers\n2. Unwind call stack (frame pointer or DWARF)\n3. Write sample to mmap ring buffer"]
    C --> D["perf report:\nAgggregate samples by IP\nDemangle symbol names\nBuild call graph tree\nAnnotate hot functions"]
```

### eBPF — Kernel Extension Without Modules

```mermaid
flowchart TD
    BPF_PROG["eBPF C Program\n// trace exec syscall\nSEC('tracepoint/syscalls/sys_enter_execve')\nvoid handle(struct trace_event_raw_sys_enter *ctx) {\n    bpf_printk('exec: %s', ctx->filename);\n}"]
    
    BPF_PROG --> CLANG["clang -target bpf → eBPF bytecode\n(restricted BPF ISA: 64-bit RISC, no loops without bound)"]
    CLANG --> VERIFY["Kernel eBPF Verifier\n- Bounds checking all memory accesses\n- No unbounded loops\n- Register type tracking\n- Stack depth ≤ 512 bytes\n→ provably safe, no kernel crash risk"]
    VERIFY --> JIT["JIT Compilation\neBPF bytecode → x86-64 native code\n(in-kernel, via bpf_int_jit_compile)"]
    JIT --> ATTACH["Attach to hook:\nkprobe, tracepoint, XDP, TC, socket, cgroup, ..."]
    ATTACH --> RUN["Runs in kernel context at hook point\nZero context switch overhead\nSubmit data via BPF maps (shared memory)"]
    RUN --> USERSPACE["User-space reads BPF maps:\nbpf_map_lookup_elem(map_fd, key, &val)\nOr perf event ring buffer"]
```

**XDP (eXpress Data Path)**: eBPF program attached to NIC driver's receive function, before SK_BUFF allocation. Can drop/redirect/pass packets at line rate (~140 Mpps on 100GbE). Used for DDoS mitigation, load balancing (Cloudflare, Facebook).

---

## 12. Container Runtime — runc and OCI Internals

```mermaid
flowchart TD
    DOCKER["docker run nginx"] --> DOCKERD["dockerd\n(Docker daemon)"]
    DOCKERD --> CONTAINERD["containerd\n(container lifecycle manager)"]
    CONTAINERD --> SHIM["containerd-shim-runc-v2\n(one per container, outlives containerd restart)"]
    SHIM --> RUNC["runc (OCI runtime)\nReads config.json (OCI spec)"]
    
    RUNC --> NS["Create namespaces:\nclone(CLONE_NEWPID|CLONE_NEWNET|CLONE_NEWNS\n|CLONE_NEWUTS|CLONE_NEWIPC|CLONE_NEWUSER)"]
    NS --> CG["Setup cgroups:\nWrite PID to /sys/fs/cgroup/.../cgroup.procs\nApply cpu.max, memory.max limits"]
    CG --> FS["Mount overlayfs:\nmount -t overlay overlay\n-o lowerdir=image_layers,upperdir=container_rw,workdir=work\n/container/rootfs"]
    FS --> SEC["Apply seccomp profile\n(whitelist syscalls via BPF filter)\nApply AppArmor/SELinux profile"]
    SEC --> EXEC["execve('/usr/sbin/nginx', args, env)\nPID 1 in new namespace"]
```

**overlayfs write path**: Any write to container filesystem → write goes to `upperdir` only. Original image layers in `lowerdir` never modified. `diff`: compare upperdir to nothing = only container-specific changes. This enables efficient layer caching (base layers shared across all containers using same image).

---

## DevOps Performance Numbers Reference

| Operation | Time | Notes |
|-----------|------|-------|
| systemd unit start (empty) | ~50-200 ms | Process spawn + D-Bus notification |
| Ansible task (SSH + Python) | ~500ms-2s | Per task overhead |
| Ansible task (Mitogen) | ~50-200 ms | Persistent Python connection |
| terraform plan (100 resources) | 5-30 s | Provider API calls |
| Docker image build (layer cache) | ~1-5 s | Only changed layers rebuilt |
| Docker image build (cold) | 30s-5 min | Full dependency install |
| Container start (cold image pull) | 10-60 s | Image layer download |
| Container start (cached) | ~0.5-2 s | overlayfs setup + execve |
| eBPF program load+verify | ~1-100 ms | Verifier complexity |
| perf record overhead | ~1-5% CPU | 99Hz sampling |
| Prometheus scrape | ~1-10 ms | HTTP + text parsing |
| Elasticsearch index write | ~1-50 ms | Translog + segment write |
| Jenkins pipeline start | ~2-10 s | Agent allocation + workspace setup |
