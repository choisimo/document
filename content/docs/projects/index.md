---
title: "프로젝트"
---

# 프로젝트 {#projects}

<nav class="hub-directory" aria-label="프로젝트 문서 목록" markdown="1">

<div class="hub-directory__groups" markdown="1">

<section class="hub-directory__group" aria-labelledby="directory-group-1" markdown="1">

<h2 id="directory-group-1">주요 문서</h2>

- [CBT Diary System](cbt-system.md)
- [Emotion Diary](emotion-diary.md)

</section>

<section class="hub-directory__group" aria-labelledby="directory-group-2" markdown="1">

<h2 id="directory-group-2">함께 읽기</h2>

- [Architecture Design Prompts](../prompts/architecture.md)
- [Database Education Prompt](../prompts/database.md)

</section>

</div>
</nav>

<details class="hub-directory-notes" markdown="1" open>
<summary>기존 문서 안내</summary>

# Projects Documentation

> Project planning, architecture, and implementation documents

## Index contract

- "Active" means the project has a maintained planning or implementation document; it does not imply production availability.
- Each project page should distinguish proposed, implemented, validated, deployed, and deprecated features.
- Completion evidence belongs in the project page and should name the environment, acceptance path, known failures, owner, and next decision.
- Update this index when a project changes status or path so the card and project document do not contradict each other.

---

## Active Projects

<div class="grid cards" markdown>

-   :material-school:{ .lg .middle } **CBT System**

    ---

    Computer-Based Testing platform for exam management and automated scoring.

    [:octicons-arrow-right-24: View Documentation](cbt-system.md)

-   :material-emoticon-happy:{ .lg .middle } **Emotion Diary**

    ---

    Emotional tracking application with AI-powered analysis and insights.

    [:octicons-arrow-right-24: View Documentation](emotion-diary.md)

</div>

---

## Project Overview

```mermaid
mindmap
  root((Projects))
    CBT System
      Exam Management
      Auto Scoring
      Analytics
      Multi-tenant
    Emotion Diary
      Daily Logging
      AI Analysis
      Trend Visualization
      Export Features
```

---

## Quick Links

| Project | Stack | Status |
|---------|-------|--------|
| [CBT System](cbt-system.md) | Spring Boot, React, PostgreSQL | Active |
| [Emotion Diary](emotion-diary.md) | React, TypeScript, Spring Boot, MySQL | Active |

---

## Project Templates

Looking to start a new project? Check out:

- [Architecture Design Prompts](../prompts/architecture.md)
- [Database Schema Guide](../prompts/database.md)

</details>
