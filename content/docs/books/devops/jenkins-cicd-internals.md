# Jenkins CI/CD Internals: Under the Hood

> Source: Jenkins Resource Guide (AdminTurnedDevOps)

---

> **Reading contract:** This is a Jenkins architecture study guide based on a secondary source. It is for administrators and pipeline authors, not a current backup, security, or recovery runbook. Bind claims to Jenkins core, Java, plugin and Remoting versions, controller topology, durability setting, agent launcher, and storage backend. A build is complete only with immutable source and artifact identifiers, test and policy evidence, deployment health, and a proven rollback. Agent loss, controller restart, plugin incompatibility, secret exposure, or deployment failure requires evidence capture, bounded retry, and escalation or rollback.

## 1. What Jenkins Actually Is: A Java-Based Event-Driven Orchestrator

Jenkins is a **Java process** (runs in a servlet container — historically Jetty, or deployed as a WAR in Tomcat) that maintains a persistent workspace directory (`$JENKINS_HOME`) and an internal execution graph. It is **not** a build runner itself — it is an **orchestrator** that delegates actual work to **build agents** via remote protocol.

```mermaid
block-beta
  columns 3
  block:JC["Jenkins Controller (Master)"]:2
    columns 2
    A["Jetty HTTP server\n:8080 (web UI + REST API)"]
    B["Job scheduler\n(Quartz/internal timer)"]
    C["Build queue\n(in-memory priority queue)"]
    D["Plugin manager\n(classloader isolation)"]
    E["$JENKINS_HOME\n(filesystem state store)"]
    F["Remoting channel\n(JNLP/SSH to agents)"]
  end
  block:AGENT["Build Agents"]:1
    columns 1
    G["Agent JVM\n(Remoting library)"]
    H["Workspace directory"]
    I["Tool installations\n(JDK, Maven, Git)"]
  end
```

The controller can run build steps when it has executors, though production guidance commonly sets controller executors to zero and uses agents. Step location also depends on the Pipeline step and plugin; controller-side Groovy and coordination work still consume controller resources.

---

## 2. $JENKINS_HOME: The Filesystem as Database

Jenkins core commonly persists substantial state under `$JENKINS_HOME`, but plugins and integrations may use external artifact stores, credentials systems, databases, clouds, and SCM. Inventory plugin-owned state before defining a backup boundary.

```mermaid
flowchart TD
  JH["$JENKINS_HOME/"]
  JH --> CFG["config.xml\n(master configuration:\nsecurity realm, auth strategy,\nnumber of executors)"]
  JH --> JOBS["jobs/\n(one subdirectory per job)"]
  JOBS --> J1["jobs/my-pipeline/\n  config.xml (job definition)\n  builds/ (build history)\n    1/ (build #1)\n      log (console output)\n      build.xml (result, duration, parameters)\n    2/\n    ..."]
  JH --> SECRETS["secrets/\n(encrypted credentials store\nmaster.key + hudson.util.Secret)"]
  JH --> PLUGINS["plugins/\n(*.jpi files — Jenkins Plugin Interchange)"]
  JH --> NODES["nodes/\n(agent definitions)"]
  JH --> USERS["users/\n(user config.xml files)"]
  JH --> WS["workspace/\n(checked-out source code per job)"]
```

**Implications**:
- A consistent backup is not merely a live `tar` of `$JENKINS_HOME`. Quiesce or use a supported snapshot method, include encryption keys and external plugin state, verify permissions, and prove restore on a compatible Jenkins/plugin version.
- Build history accumulates indefinitely unless configured with **build discarder** (`logRotator`)
- Plugin updates install new `.jpi` files; restart loads them via classloader
- Credentials are encrypted with `master.key` (AES-128) — losing this key = losing all stored credentials

---

## 3. Build Queue and Executor Model

```mermaid
stateDiagram-v2
  [*] --> Queued: trigger (SCM poll / webhook / timer / manual)
  Queued --> Blocked: "waiting for dependency\nor throttle constraint"
  Queued --> Buildable: executor available
  Buildable --> Running: assigned to executor on agent
  Running --> Completed: steps all finished
  Running --> Aborted: user interrupt / timeout
  Completed --> [*]: result stored in build.xml
```

**Executor slots**: Each node (controller or agent) has a configured number of **executors** (parallel job capacity). When a build is triggered, Jenkins checks the queue against available executor slots across all connected agents. The **scheduler loop** runs continuously, assigning queued builds to free executors based on:

1. **Label expressions**: does the agent have the required label (e.g., `linux && docker`)?
2. **Node affinity**: is the job pinned to a specific agent?
3. **Queue priority**: FIFO by default, modified by priority plugins

```mermaid
flowchart LR
  TRIG["Build trigger\n(webhook POST\nor SCM poll result)"]
  TRIG --> Q["Build Queue\n(in-memory, serialized to queue.xml)"]
  Q --> SCHED["Scheduler loop\n(every 200ms)"]
  SCHED --> LABEL["label expression match?\ncheck agent capabilities"]
  LABEL --> EXEC{"free executor?"}
  EXEC -- yes --> ASSIGN["assign build to agent executor\nopen Remoting channel"]
  EXEC -- no --> WAIT["remain in queue\nlog: 'waiting for next available executor'"]
  ASSIGN --> RUN["build steps execute on agent JVM"]
```

---

## 4. Jenkinsfile: Pipeline DSL Compilation and Execution

A Jenkinsfile is a **Groovy DSL** compiled by Jenkins into a **CPS (Continuation Passing Style)** execution graph. This is the key to Jenkins' ability to survive controller restarts mid-build.

```mermaid
flowchart TD
  JF["Jenkinsfile (Groovy DSL)"]
  JF --> PARSE["Groovy parser\n(Jenkins CPS plugin)"]
  PARSE --> CPS["CPS transformation\nconverts normal Groovy into\ncontinuation-passing form"]
  CPS --> EXEC["Execution engine\n(Pipeline execution thread)"]
  EXEC --> CKPT["checkpoint: serialize execution state\nto $JENKINS_HOME/jobs/X/builds/N/program.dat"]
  CKPT --> STEPS["individual step execution\nvia step descriptors (plugin registry)"]
  STEPS --> AGENT["dispatched to agent via Remoting\nsh/bat/docker/maven steps run on agent JVM"]
```

**CPS (Continuation Passing Style)** transform: every Jenkins Pipeline step is wrapped so that after each step completes, the continuation (next action) is serialized. If the Jenkins controller restarts, it deserializes `program.dat` and resumes from the last checkpoint — builds survive controller upgrades.

### Declarative vs Scripted Pipeline: AST Differences

```mermaid
block-beta
  columns 2
  block:DECL["Declarative Pipeline"]:1
    columns 1
    D1["pipeline { ... }"]
    D2["strict schema validation\n(validated at parse time)"]
    D3["post { always { } failure { } }\nbuilt-in lifecycle hooks"]
    D4["options { retry(3) timeout(10, MINUTES) }\nbuilt-in step wrappers"]
  end
  block:SCRIPT["Scripted Pipeline"]:1
    columns 1
    S1["node('linux') { ... }"]
    S2["arbitrary Groovy — full language\n(loops, try/catch, closures)"]
    S3["manual error handling\nrequired everywhere"]
    S4["no schema — flexible\nbut error-prone"]
  end
```

---

## 5. Stage Execution: Parallel and Sequential

```mermaid
flowchart TD
  START["pipeline start\nagent allocated"]
  START --> S1["stage('Checkout')\ncheckout scm\n(Git clone/fetch on agent workspace)"]
  S1 --> S2["stage('Build')\nsh 'mvn package -DskipTests'\n(Maven runs on agent JVM fork)"]
  S2 --> PARALLEL["stage('Test') - parallel branches"]
  PARALLEL --> UNIT["branch: Unit Tests\nsh 'mvn test'\n(Surefire plugin runs in Maven fork)"]
  PARALLEL --> INTEG["branch: Integration Tests\ndocker.image('postgres').withRun { }\nsh 'mvn verify -P integration'"]
  PARALLEL --> SEC["branch: Security Scan\nsh 'trivy image myapp:latest'"]
  UNIT --> JOIN["parallel join\n(all branches must complete)"]
  INTEG --> JOIN
  SEC --> JOIN
  JOIN --> S3["stage('Push')\ndocker push registry/myapp:$GIT_SHA"]
  S3 --> S4["stage('Deploy')\nkubectl set image deployment/app\napp=registry/myapp:$GIT_SHA"]
```

`parallel` branches are concurrent in the Pipeline graph, but they consume separate executors only when their nested `node` or `agent` allocations require them. Failure aggregation and fail-fast behavior depend on Pipeline options and branch error handling.

---

## 6. Agent Communication: Remoting Protocol Internals

```mermaid
sequenceDiagram
  participant JC as Jenkins Controller
  participant A as Agent JVM (Remoting)

  JC->>A: TCP connection (port 50000 JNLP\nor SSH port 22)
  A->>JC: capability negotiation\n(serialization protocol version)
  JC->>A: Capability{classloader, serialization=XStream}
  Note over JC,A: bidirectional ObjectStream established
  JC->>A: RemoteClassLoader.fetch(StepClass.class)\n(classload step implementation to agent)
  A-->>JC: class bytes loaded
  JC->>A: execute(ShellStep, cmd="mvn package", workspace="/ws/job/")
  A->>A: fork child process\nsh -c "mvn package"\nin workspace directory
  A-->>JC: stream stdout/stderr (chunked byte[])
  A-->>JC: RemoteResult{exitCode=0}
```

The **Remoting channel** serializes Java objects across the TCP connection using a custom protocol. Step implementations (e.g., `ShellStep`, `DockerBuildStep`) are classloaded **from the controller to the agent** on demand — agents do not need plugins pre-installed. This is why plugin updates on the controller immediately affect all agents.

### Agent Types

```mermaid
block-beta
  columns 3
  block:SSH["SSH Agent"]:1
    columns 1
    S1["Controller SSHs to agent host"]
    S2["Uploads agent.jar via SCP"]
    S3["Launches: java -jar agent.jar"]
    S4["Reconnects on failure"]
  end
  block:JNLP["JNLP/WebSocket Agent"]:1
    columns 1
    J1["Agent initiates connection to controller"]
    J2["Useful behind NAT/firewall"]
    J3["Docker containers use this\n(agent as container)"]
    J4["kubernetes plugin: pod as agent"]
  end
  block:DOCKER["Dynamic Docker Agent"]:1
    columns 1
    D1["Docker plugin\ncreates container per build"]
    D2["agent.jar injected via\ndocker exec or volume mount"]
    D3["container destroyed after build\nephmeral, clean environment"]
    D4["image specified in Jenkinsfile:\nagent { docker { image 'maven:3.8' } }"]
  end
```

---

## 7. Plugin Architecture: Classloader Isolation

Jenkins loads each plugin in its **own classloader**, preventing dependency conflicts between plugins:

```mermaid
flowchart TD
  JCL["Jenkins Core ClassLoader\n(jenkins.war classes)"]
  JCL --> PCL1["Plugin ClassLoader: git-plugin\n(git-client-4.x.jar, jgit.jar)"]
  JCL --> PCL2["Plugin ClassLoader: docker-plugin\n(docker-java-3.x.jar)"]
  JCL --> PCL3["Plugin ClassLoader: kubernetes-plugin\n(fabric8-kubernetes-client.jar)"]
  PCL1 --> EXT["Extension Points\n(SCMDescriptor, BuildWrapper, etc.)\nregistered in Jenkins plugin registry"]
  PCL2 --> EXT
  PCL3 --> EXT
  EXT --> JOBS["Job configurations reference\nextension implementations\nby class name in config.xml"]
```

**Extension Points**: Jenkins defines interfaces like `Builder`, `Publisher`, `SCM`, `Notifier`. Plugins implement these and annotate with `@Extension` — Jenkins discovers them via `ServiceLoader`-style lookup at startup. This is how `sh` (from workflow-durable-task-step plugin), `docker.build` (from docker-workflow plugin), and `git()` (from git plugin) are all available in Pipelines.

**Plugin dependency graph**: if Plugin A requires Plugin B ≥ 2.0, Jenkins validates this at startup. Circular dependencies cause classloader deadlocks — a known Jenkins pathology.

---

## 8. SCM Polling vs Webhooks: Internal Trigger Mechanics

```mermaid
flowchart LR
  subgraph POLL["SCM Polling (pull model)"]
    PT["polling timer\n(cron expression: H/5 * * * *)"]
    PT --> FETCH["git ls-remote origin\ncompare remote HEAD to last-seen SHA"]
    FETCH --> DIFF{new commits?}
    DIFF -- yes --> QTRIG["add to build queue\nwith SCM change trigger cause"]
    DIFF -- no --> SKIP["no-op"]
  end
  subgraph HOOK["Webhooks (push model)"]
    GH["GitHub/GitLab\nPOST /github-webhook/\n(HMAC-SHA256 signature)"]
    GH --> VERIFY["Jenkins verifies\nX-Hub-Signature-256 header"]
    VERIFY --> MATCH["match to Multibranch Pipeline\nor Pipeline job via repo URL"]
    MATCH --> SCAN["branch scan\n(Multibranch: detect new branches/PRs)"]
    SCAN --> QTRIG2["add triggered build to queue"]
  end
```

**Multibranch Pipeline** branch scanning: on webhook event, Jenkins scans the entire repository for new/deleted branches and creates/deletes corresponding pipeline jobs automatically. Each branch gets its own `jobs/repo/branches/feature-x/` directory. This is how `Jenkinsfile` in a PR branch auto-triggers a pipeline for that PR.

---

## 9. Security Model: Authentication and Authorization Internals

```mermaid
flowchart TD
  REQ["HTTP request to Jenkins\n(web UI or REST API)"]
  REQ --> SR["Security Realm\n(authentication)"]
  SR --> LDAP["LDAP/AD\n(LdapSecurityRealm)"]
  SR --> SAML["SSO/SAML\n(saml plugin)"]
  SR --> LOCAL["Jenkins own user DB\n(HudsonPrivateSecurityRealm)\npasswords stored as bcrypt hash\nin users/*/config.xml"]
  LDAP --> PRINCIPAL["authenticated Principal\n(username + group memberships)"]
  SAML --> PRINCIPAL
  LOCAL --> PRINCIPAL
  PRINCIPAL --> AZ["Authorization Strategy"]
  AZ --> MATRIX["Matrix Authorization\n(per-user, per-group permission matrix)\nstored in config.xml"]
  AZ --> ROLE["Role Strategy Plugin\n(RBAC: role definitions + assignments)"]
  AZ --> FOLDER["Folder-Based Authorization\n(permissions scoped to folders)"]
  MATRIX --> ALLOW["ALLOW: proceed with request"]
  MATRIX --> DENY["DENY: HTTP 403"]
```

**Credential binding:** Storage and encryption depend on credential type and plugin version. `withCredentials` scopes binding and attempts console masking, but masking is not a security boundary: child processes, debug output, transformed values, temporary files, process inspection, or a malicious build can expose plaintext. Use isolated agents, least privilege, short-lived credentials, and post-build revocation evidence.

```mermaid
sequenceDiagram
  participant JF as Jenkinsfile step
  participant CB as CredentialBinding
  participant CS as CredentialStore (encrypted)
  participant ENV as agent environment

  JF->>CB: withCredentials([usernamePassword(credentialsId: 'aws-creds')])
  CB->>CS: decrypt credential using master.key
  CS-->>CB: plaintext username + password
  CB->>ENV: inject as env vars AWS_USER, AWS_PASS (in-memory only)
  JF->>ENV: sh 'aws configure...' (env vars available)
  Note over CB,ENV: variables masked in console output
  CB->>ENV: clear env vars on block exit
```

---

## 10. Build Artifact Flow: Archive and Fingerprinting

```mermaid
flowchart LR
  BUILD["build step\nsh 'mvn package'\nproduces target/app.jar"]
  BUILD --> ARCH["archiveArtifacts artifacts: 'target/*.jar'\ncopied from agent workspace\nto controller $JENKINS_HOME/jobs/X/builds/N/archive/"]
  ARCH --> FP["fingerprint: MD5 hash of artifact\nstored in $JENKINS_HOME/fingerprints/\nlinks artifact to build that produced it"]
  FP --> TRACE["traceability:\nwhich builds consumed this artifact?\nwhich build produced it?\n(cross-job dependency tracking)"]
  ARCH --> DOWN["accessible via HTTP:\n/job/X/N/artifact/target/app.jar"]
```

**Artifact promotion**: the `copy-artifact` plugin allows a downstream job to pull artifacts from an upstream build — Jenkins checks the fingerprint to verify the artifact came from the declared source job at the declared build number.

---

## 11. Pipeline Durability and Checkpoint Mechanism

```mermaid
stateDiagram-v2
  direction LR
  [*] --> EXEC: pipeline running
  EXEC --> SERIAL: step completes\nCPS serializes continuation\nto program.dat
  SERIAL --> EXEC: next step begins
  EXEC --> SUSPEND: controller restart\nor agent reconnect wait
  SUSPEND --> RESUME: controller restarts\ndeserializes program.dat\nresumes from last checkpoint
  RESUME --> EXEC: execution continues from\nlast durable step
  EXEC --> DONE: all stages complete\nresult stored in build.xml
```

**Durable steps** (filesystem operations, `sh`, `bat`) write progress atomically. **Non-durable steps** (pure Groovy logic) may replay from checkpoint. The `PERFORMANCE_OPTIMIZED` durability hint reduces checkpoint frequency (faster builds, less resilient to crashes); `MAX_SURVIVABILITY` checkpoints after every step.

---

## 12. Full CI/CD Internal Data Flow

```mermaid
sequenceDiagram
  participant DEV as Developer
  participant GH as GitHub
  participant JC as Jenkins Controller
  participant AGENT as Build Agent (Docker container)
  participant REG as Container Registry
  participant K8S as Kubernetes

  DEV->>GH: git push (feature branch)
  GH->>JC: POST /github-webhook/ (HMAC signed)
  JC->>JC: verify signature, match to Multibranch Pipeline
  JC->>GH: GitHub API: get branch HEAD SHA
  JC->>JC: create new Pipeline job for branch (if new)
  JC->>AGENT: spawn Docker container (maven:3.8 image)\nassign executor, inject agent.jar via JNLP
  JC->>AGENT: checkout scm (git clone/fetch via SSH key from credentials store)
  AGENT->>AGENT: sh 'mvn package' (compile + unit tests in Maven fork)
  AGENT-->>JC: stream stdout log (chunked via Remoting)
  AGENT->>AGENT: sh 'trivy image...' (security scan)
  AGENT->>REG: docker push app:$GIT_SHA (push new layers only)
  AGENT->>K8S: kubectl set image deployment/app app=registry/app:$GIT_SHA
  K8S-->>AGENT: rolling update started (MaxSurge=1)
  AGENT-->>JC: build result: SUCCESS
  JC->>JC: store build.xml, archive artifacts, update fingerprints
  JC->>GH: POST /statuses (commit status: success/failure)
  JC->>AGENT: destroy container (ephemeral agent cleanup)
```

---

## 13. Blue Ocean: Visualization Layer Architecture

Blue Ocean is a Jenkins plugin that provides a React.js-based SPA over the existing Jenkins REST API — it does not change execution internals, only the UI rendering layer.

```mermaid
flowchart LR
  BROWSER["Browser\n(Blue Ocean SPA: React.js)"]
  BROWSER --> BLUEAPI["Blue Ocean REST API\n(/blue/rest/)\n(wrapper over Jenkins internal model)"]
  BLUEAPI --> PIPELINE["PipelineNode model\n(maps CPS execution graph\nto stage/step tree for UI)"]
  PIPELINE --> RUNS["Run model\n(wraps Build object)\nbuild.xml → JSON"]
  RUNS --> LOG["LogStream API\n(SSE: Server-Sent Events)\nreal-time console output streaming"]
  LOG --> BROWSER
```

The **visual pipeline editor** in Blue Ocean serializes a Declarative Jenkinsfile AST to/from a JSON intermediate representation — edits in the GUI regenerate the Jenkinsfile text and commit it to the SCM.

---

## 14. Scaling Jenkins: Controller Bottlenecks and Mitigation

```mermaid
block-fibonacci
  columns 1
  block:BOTTLENECK["Jenkins Controller Bottlenecks"]:1
    columns 3
    B1["Build Queue: single JVM\nO(N) queue scan per poll cycle\n→ use priority queue plugin"]
    B2["Remoting channels: one TCP connection per agent\nO(N) agent connections saturate controller threads\n→ WebSocket agents, agent pools"]
    B3["$JENKINS_HOME IOPS: build history writes\nat build completion overwhelm NFS\n→ SSD-backed local storage"]
    B4["Plugin classloader: hundreds of plugins\nfull GC pauses in large JVM heaps\n→ JVM tuning: -XX:+UseG1GC -Xmx8g"]
    B5["SCM polling: H/5 * * * * × 1000 jobs\n= 200 ls-remote calls/minute to Git server\n→ replace with webhooks"]
  end
```

**CloudBees CI / Jenkins Operations Center**: addresses single-controller limits by routing builds across multiple controllers. Operations Center has a global build queue that forwards jobs to registered controllers based on label matching — similar to K8s scheduler operating across a cluster of Jenkins instances.

---

## Summary: Jenkins Internal Execution Path

```mermaid
flowchart TD
  GIT["git push\nor timer trigger"]
  GIT --> WEBHOOK["webhook POST to Jenkins\nHMAC-SHA256 verified"]
  WEBHOOK --> QUEUE["build added to in-memory queue\n(serialized to queue.xml)"]
  QUEUE --> SCHED["scheduler loop: label match\n→ assign to agent executor"]
  SCHED --> REMOTE["Remoting channel opens\ncontroller → agent TCP"]
  REMOTE --> CLASSLOAD["step implementation classes\nloaded from controller to agent"]
  CLASSLOAD --> WORKSPACE["SCM checkout to agent workspace\n(git clone/fetch)"]
  WORKSPACE --> STEPS["pipeline steps execute on agent JVM:\nsh → child process fork\ndocker.build → Docker API call\nmvn → Maven JVM fork"]
  STEPS --> CPS["CPS continuation serialized\nto program.dat after each durable step"]
  CPS --> RESULT["build result persisted\nto $JENKINS_HOME/jobs/X/builds/N/build.xml\nartifacts archived, fingerprints stored"]
  RESULT --> NOTIFY["post-build notifications:\nGitHub status API, Slack, email\nvia plugin extension points"]
```

The final path is one multibranch, webhook, CPS, ephemeral-agent example. Freestyle jobs, controller executors, polling, non-durable steps, alternate agents, and plugin-specific steps take different paths; use build causes, FlowGraph, queue, node, and deployment records as completion evidence.
