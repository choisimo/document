use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::OnceLock;

use anyhow::{bail, Context, Result};
use merman_core::{Engine, ParseOptions};
use regex::Regex;
use walkdir::WalkDir;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CheckKind {
    Mermaid,
    Links,
}

#[derive(Debug, Clone)]
pub struct ValidationIssue {
    pub kind: CheckKind,
    pub file: PathBuf,
    pub line: Option<usize>,
    pub detail: String,
}

#[derive(Debug, Clone)]
pub struct ValidationOptions {
    pub source_root: PathBuf,
    pub docs_base: PathBuf,
    pub check_mermaid: bool,
    pub check_links: bool,
}

#[derive(Debug, Default, Clone)]
pub struct ValidationReport {
    pub scanned_files: usize,
    pub mermaid_blocks: usize,
    pub links_checked: usize,
    pub issues: Vec<ValidationIssue>,
}

#[derive(Debug, Default)]
struct ScannedDoc {
    anchors: HashSet<String>,
    links: Vec<LinkRef>,
    mermaid_blocks: Vec<MermaidBlock>,
}

#[derive(Debug)]
struct LinkRef {
    target: String,
    line: usize,
}

#[derive(Debug)]
struct MermaidBlock {
    code: String,
    start_line: usize,
}

pub fn validate(options: &ValidationOptions) -> Result<ValidationReport> {
    let source_root = normalize_absolute(&options.source_root)?;
    let docs_base = normalize_absolute(&options.docs_base)?;
    if !source_root.exists() {
        bail!("source root does not exist: {}", source_root.display());
    }
    if !docs_base.exists() {
        bail!("docs base does not exist: {}", docs_base.display());
    }

    let source_files = collect_markdown_files(&source_root)?;
    let source_set: HashSet<PathBuf> = source_files.iter().cloned().collect();
    if source_files.is_empty() {
        bail!(
            "no markdown files found under source root: {}",
            source_root.display()
        );
    }

    let all_docs = collect_markdown_files(&docs_base)?;
    let mut anchor_index: HashMap<PathBuf, HashSet<String>> = HashMap::new();
    let mut source_scans: HashMap<PathBuf, ScannedDoc> = HashMap::new();

    for file in &all_docs {
        let is_source = source_set.contains(file);
        let scanned = scan_markdown(
            file,
            options.check_links && is_source,
            options.check_mermaid && is_source,
        )?;

        anchor_index.insert(file.clone(), scanned.anchors.clone());
        if is_source {
            source_scans.insert(file.clone(), scanned);
        }
    }

    let mut report = ValidationReport {
        scanned_files: source_files.len(),
        ..ValidationReport::default()
    };

    if options.check_mermaid {
        let engine = Engine::new();
        for file in &source_files {
            if let Some(scanned) = source_scans.get(file) {
                report.mermaid_blocks += scanned.mermaid_blocks.len();
                for block in &scanned.mermaid_blocks {
                    match engine.parse_diagram_sync(&block.code, ParseOptions::strict()) {
                        Ok(Some(_)) => {}
                        Ok(None) => report.issues.push(ValidationIssue {
                            kind: CheckKind::Mermaid,
                            file: file.clone(),
                            line: Some(block.start_line),
                            detail: "Mermaid diagram could not be parsed (no diagram detected)"
                                .to_string(),
                        }),
                        Err(err) => report.issues.push(ValidationIssue {
                            kind: CheckKind::Mermaid,
                            file: file.clone(),
                            line: Some(block.start_line),
                            detail: format!("Mermaid parse error: {err}"),
                        }),
                    }
                }
            }
        }
    }

    if options.check_links {
        for file in &source_files {
            let Some(scanned) = source_scans.get(file) else {
                continue;
            };

            report.links_checked += scanned.links.len();
            for link in &scanned.links {
                if let Some(detail) = validate_link_target(file, link, &docs_base, &anchor_index)? {
                    report.issues.push(ValidationIssue {
                        kind: CheckKind::Links,
                        file: file.clone(),
                        line: Some(link.line),
                        detail,
                    });
                }
            }
        }
    }

    report.issues.sort_by(|a, b| {
        a.file
            .cmp(&b.file)
            .then(a.line.cmp(&b.line))
            .then(a.detail.cmp(&b.detail))
    });

    Ok(report)
}

fn scan_markdown(path: &Path, collect_links: bool, collect_mermaid: bool) -> Result<ScannedDoc> {
    let content = fs::read_to_string(path)
        .with_context(|| format!("failed to read markdown file: {}", path.display()))?;

    let mut doc = ScannedDoc::default();
    let mut in_fence = false;
    let mut fence_delim = String::new();
    let mut capturing_mermaid = false;
    let mut mermaid_start = 0usize;
    let mut mermaid_buf = String::new();
    let mut slug_counts: HashMap<String, usize> = HashMap::new();

    for (idx, line) in content.lines().enumerate() {
        let line_no = idx + 1;
        let trimmed = line.trim_start();

        if !in_fence {
            if let Some((delim, info)) = parse_fence_open(trimmed) {
                in_fence = true;
                fence_delim = delim.to_string();
                capturing_mermaid = collect_mermaid && info.starts_with("mermaid");
                mermaid_start = line_no;
                mermaid_buf.clear();
                continue;
            }

            collect_anchors_from_line(line, &mut doc.anchors, &mut slug_counts);

            if collect_links {
                for target in extract_markdown_links(line) {
                    doc.links.push(LinkRef {
                        target,
                        line: line_no,
                    });
                }
                for target in extract_html_link_attrs(line) {
                    doc.links.push(LinkRef {
                        target,
                        line: line_no,
                    });
                }
            }
        } else {
            if is_fence_close(trimmed, &fence_delim) {
                in_fence = false;
                fence_delim.clear();
                if capturing_mermaid {
                    doc.mermaid_blocks.push(MermaidBlock {
                        code: mermaid_buf.clone(),
                        start_line: mermaid_start,
                    });
                    mermaid_buf.clear();
                    capturing_mermaid = false;
                }
                continue;
            }

            if capturing_mermaid {
                mermaid_buf.push_str(line);
                mermaid_buf.push('\n');
            }
        }
    }

    if capturing_mermaid && !mermaid_buf.is_empty() {
        doc.mermaid_blocks.push(MermaidBlock {
            code: mermaid_buf,
            start_line: mermaid_start,
        });
    }

    Ok(doc)
}

fn validate_link_target(
    source_file: &Path,
    link: &LinkRef,
    docs_base: &Path,
    anchor_index: &HashMap<PathBuf, HashSet<String>>,
) -> Result<Option<String>> {
    let raw = normalize_link_target(&link.target);
    if raw.is_empty() {
        return Ok(Some("empty link target".to_string()));
    }
    if is_external_target(&raw) || is_template_target(&raw) {
        return Ok(None);
    }

    let (path_part, fragment) = split_fragment(&raw);
    let target_path = if path_part.is_empty() {
        normalize_absolute(source_file)?
    } else {
        let resolved = resolve_target_path(source_file, path_part, docs_base);
        let Some(resolved) = resolved else {
            return Ok(Some(format!("target not found: {path_part}")));
        };
        resolved
    };

    if !target_path.exists() {
        return Ok(Some(format!(
            "target does not exist: {}",
            target_path.display()
        )));
    }

    if let Some(fragment) = fragment {
        if !fragment.is_empty() && is_markdown_file(&target_path) {
            let wanted = normalize_fragment(fragment);
            if wanted.is_empty() {
                return Ok(None);
            }

            let Some(anchors) = anchor_index.get(&target_path) else {
                return Ok(Some(format!(
                    "anchor index missing for markdown target: {}",
                    target_path.display()
                )));
            };

            let wanted_slug = slugify_heading(&wanted);
            if !anchors.contains(&wanted) && !anchors.contains(&wanted_slug) {
                return Ok(Some(format!(
                    "missing anchor '#{fragment}' in {}",
                    target_path.display()
                )));
            }
        }
    }

    Ok(None)
}

fn collect_anchors_from_line(
    line: &str,
    anchors: &mut HashSet<String>,
    slug_counts: &mut HashMap<String, usize>,
) {
    if let Some(caps) = heading_re().captures(line) {
        let mut title = caps
            .get(2)
            .map(|m| m.as_str())
            .unwrap_or_default()
            .trim()
            .trim_end_matches('#')
            .trim()
            .to_string();

        if let Some(anchor_caps) = explicit_anchor_re().captures(&title) {
            if let Some(explicit) = anchor_caps.get(1).map(|m| m.as_str()) {
                anchors.insert(explicit.trim().to_lowercase());
            }
            title = explicit_anchor_re().replace(&title, "").to_string();
            title = title.trim().to_string();
        }

        let base = slugify_heading(&title);
        if !base.is_empty() {
            let count = slug_counts.entry(base.clone()).or_insert(0);
            let deduped = if *count == 0 {
                base.clone()
            } else {
                format!("{base}-{}", *count)
            };
            *count += 1;
            anchors.insert(base);
            anchors.insert(deduped);
        }
    }

    for caps in html_id_re().captures_iter(line) {
        if let Some(id) = caps.get(1).or_else(|| caps.get(2)).map(|m| m.as_str()) {
            anchors.insert(id.trim().to_lowercase());
        }
    }
}

fn parse_fence_open(trimmed: &str) -> Option<(&str, &str)> {
    let mut chars = trimmed.chars();
    let first = chars.next()?;
    if first != '`' && first != '~' {
        return None;
    }

    let mut len = 1usize;
    for ch in chars {
        if ch == first {
            len += 1;
        } else {
            break;
        }
    }
    if len < 3 {
        return None;
    }

    let delim = &trimmed[..len];
    let rest = trimmed[len..].trim();
    Some((delim, rest))
}

fn is_fence_close(trimmed: &str, delim: &str) -> bool {
    trimmed.starts_with(delim)
}

fn extract_markdown_links(line: &str) -> Vec<String> {
    markdown_link_re()
        .captures_iter(line)
        .filter_map(|caps| caps.get(1).map(|m| m.as_str()))
        .map(normalize_link_target)
        .filter(|s| !s.is_empty())
        .collect()
}

fn extract_html_link_attrs(line: &str) -> Vec<String> {
    html_link_attr_re()
        .captures_iter(line)
        .filter_map(|caps| caps.get(1).or_else(|| caps.get(2)).map(|m| m.as_str()))
        .map(normalize_link_target)
        .filter(|s| !s.is_empty())
        .collect()
}

fn normalize_link_target(raw: &str) -> String {
    let mut s = raw.trim().to_string();

    if s.starts_with('<') && s.ends_with('>') && s.len() >= 2 {
        s = s[1..s.len() - 1].trim().to_string();
    }

    // For markdown link destination with optional title: (path "title")
    if let Some(space_idx) = s.find(char::is_whitespace) {
        s = s[..space_idx].to_string();
    }

    s
}

fn is_external_target(target: &str) -> bool {
    let lower = target.to_ascii_lowercase();
    lower.starts_with("http://")
        || lower.starts_with("https://")
        || lower.starts_with("mailto:")
        || lower.starts_with("tel:")
        || lower.starts_with("ftp://")
        || lower.starts_with("javascript:")
        || lower.starts_with("data:")
}

fn is_template_target(target: &str) -> bool {
    target.contains("{{") || target.contains("{%")
}

fn split_fragment(target: &str) -> (&str, Option<&str>) {
    match target.split_once('#') {
        Some((path, frag)) => (path, Some(frag)),
        None => (target, None),
    }
}

fn resolve_target_path(source_file: &Path, raw_path: &str, docs_base: &Path) -> Option<PathBuf> {
    let path_without_query = raw_path.split('?').next().unwrap_or(raw_path).trim();
    if path_without_query.is_empty() {
        return Some(normalize_path(source_file.to_path_buf()));
    }

    let decoded = urlencoding::decode(path_without_query)
        .map(|v| v.into_owned())
        .unwrap_or_else(|_| path_without_query.to_string());
    let path = decoded.as_str();

    let raw_candidate = if path.starts_with('/') {
        let rel = path.trim_start_matches('/');
        docs_base.join(rel)
    } else {
        let parent = source_file.parent()?;
        parent.join(path)
    };

    resolve_path_candidates(normalize_path(raw_candidate), path.ends_with('/'))
}

fn resolve_path_candidates(path: PathBuf, had_trailing_slash: bool) -> Option<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or_default();
    let has_ext = !ext.is_empty();

    candidates.push(path.clone());

    if had_trailing_slash {
        candidates.push(path.join("index.md"));
    }

    if !has_ext {
        candidates.push(path.with_extension("md"));
        candidates.push(path.join("index.md"));
    }

    for candidate in candidates {
        if candidate.exists() && candidate.is_file() {
            return Some(normalize_path(candidate));
        }
    }

    None
}

fn normalize_fragment(fragment: &str) -> String {
    let decoded = urlencoding::decode(fragment)
        .map(|v| v.into_owned())
        .unwrap_or_else(|_| fragment.to_string());
    decoded.trim().trim_start_matches('#').to_lowercase()
}

fn slugify_heading(input: &str) -> String {
    let stripped = html_tag_re().replace_all(input, "");
    let lowered = stripped.to_lowercase();
    let mut out = String::with_capacity(lowered.len());
    let mut prev_dash = false;

    for ch in lowered.chars() {
        if ch.is_alphanumeric() || ch == '_' || ch == '-' {
            out.push(ch);
            prev_dash = false;
        } else if ch.is_whitespace() {
            if !prev_dash {
                out.push('-');
                prev_dash = true;
            }
        }
    }

    out.trim_matches('-').to_string()
}

fn collect_markdown_files(root: &Path) -> Result<Vec<PathBuf>> {
    let mut files = Vec::new();
    for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }
        if entry.path().extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        files.push(normalize_absolute(entry.path())?);
    }
    files.sort();
    Ok(files)
}

fn normalize_absolute(path: &Path) -> Result<PathBuf> {
    let abs = if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::env::current_dir()
            .context("failed to read current directory")?
            .join(path)
    };
    Ok(normalize_path(abs))
}

fn normalize_path(path: PathBuf) -> PathBuf {
    let mut out = PathBuf::new();
    for component in path.components() {
        match component {
            Component::ParentDir => {
                out.pop();
            }
            Component::CurDir => {}
            other => out.push(other.as_os_str()),
        }
    }
    out
}

fn is_markdown_file(path: &Path) -> bool {
    path.extension().and_then(|e| e.to_str()) == Some("md")
}

fn heading_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"^(#{1,6})\s+(.+?)\s*$").expect("valid regex"))
}

fn explicit_anchor_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\s*\{#([^}]+)\}\s*$").expect("valid regex"))
}

fn markdown_link_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"!?\[[^\]]*\]\(([^)]+)\)").expect("valid regex"))
}

fn html_link_attr_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r#"(?i)\b(?:href|src)\s*=\s*"([^"]+)"|\b(?:href|src)\s*=\s*'([^']+)'"#)
            .expect("valid regex")
    })
}

fn html_tag_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"<[^>]+>").expect("valid regex"))
}

fn html_id_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r#"(?i)\bid\s*=\s*"([^"]+)"|\bid\s*=\s*'([^']+)'"#).expect("valid regex")
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn strict_mermaid_validation_detects_invalid_syntax() {
        let dir = tempdir().expect("tempdir");
        let docs = dir.path().join("docs");
        fs::create_dir_all(&docs).expect("mkdir");

        fs::write(
            docs.join("good.md"),
            "# Good\n\n```mermaid\nflowchart TD\n  A --> B\n```\n",
        )
        .expect("write good");
        fs::write(
            docs.join("bad.md"),
            "# Bad\n\n```mermaid\nflowchart TD\n  A -->\n```\n",
        )
        .expect("write bad");

        let report = validate(&ValidationOptions {
            source_root: docs.clone(),
            docs_base: docs,
            check_mermaid: true,
            check_links: false,
        })
        .expect("validate");

        assert_eq!(report.mermaid_blocks, 2);
        assert!(report
            .issues
            .iter()
            .any(|i| i.kind == CheckKind::Mermaid && i.file.ends_with("bad.md")));
        assert!(!report
            .issues
            .iter()
            .any(|i| i.kind == CheckKind::Mermaid && i.file.ends_with("good.md")));
    }

    #[test]
    fn strict_link_validation_checks_file_and_anchor() {
        let dir = tempdir().expect("tempdir");
        let docs = dir.path().join("docs");
        let sub = docs.join("guide");
        fs::create_dir_all(&sub).expect("mkdir");

        fs::write(
            sub.join("index.md"),
            r#"# Start

Good markdown link: [Go](target.md#target-anchor)
Good html link: <a href="target/">Target Dir</a>
Bad file link: [Missing](missing.md)
Bad anchor link: [Bad Anchor](target.md#does-not-exist)
"#,
        )
        .expect("write source");

        fs::write(
            sub.join("target.md"),
            r#"# Target Anchor
## Target Anchor
"#,
        )
        .expect("write target");

        fs::create_dir_all(sub.join("target")).expect("mkdir target dir");
        fs::write(sub.join("target/index.md"), "# Target Dir\n").expect("write target dir");

        let report = validate(&ValidationOptions {
            source_root: docs.clone(),
            docs_base: docs,
            check_mermaid: false,
            check_links: true,
        })
        .expect("validate");

        let link_issues: Vec<&ValidationIssue> = report
            .issues
            .iter()
            .filter(|i| i.kind == CheckKind::Links)
            .collect();
        assert_eq!(link_issues.len(), 2);
        assert!(link_issues
            .iter()
            .any(|i| i.detail.contains("target not found")));
        assert!(link_issues
            .iter()
            .any(|i| i.detail.contains("missing anchor")));
    }
}
