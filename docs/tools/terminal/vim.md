# Vim Guide

> Essential Vim commands and workflows

---

## Mode Overview

```mermaid
stateDiagram-v2
    [*] --> Normal: vim file
    Normal --> Insert: i, a, o
    Insert --> Normal: Esc
    Normal --> Visual: v, V, Ctrl+v
    Visual --> Normal: Esc
    Normal --> Command: :
    Command --> Normal: Enter/Esc
```

| Mode | Purpose | Enter | Exit |
|------|---------|-------|------|
| **Normal** | Navigation, commands | `Esc` | - |
| **Insert** | Text editing | `i`, `a`, `o` | `Esc` |
| **Visual** | Selection | `v`, `V`, `Ctrl+v` | `Esc` |
| **Command** | Ex commands | `:` | `Enter` |

---

## Window Management

### Split Windows

| Command | Action |
|---------|--------|
| `:split` or `:sp` | Horizontal split |
| `:vsplit` or `:vs` | Vertical split |
| `:sp filename` | Open file in horizontal split |
| `:vs filename` | Open file in vertical split |

### Navigate Between Windows

| Key | Action |
|-----|--------|
| `Ctrl+w w` | Next window |
| `Ctrl+w W` | Previous window |
| `Ctrl+w h` | Move to left window |
| `Ctrl+w j` | Move to window below |
| `Ctrl+w k` | Move to window above |
| `Ctrl+w l` | Move to right window |
| `Ctrl+w <number>` | Move to window by number |

### Resize Windows

| Key | Action |
|-----|--------|
| `Ctrl+w =` | Equal size all windows |
| `Ctrl+w +` | Increase height |
| `Ctrl+w -` | Decrease height |
| `Ctrl+w >` | Increase width |
| `Ctrl+w <` | Decrease width |
| `Ctrl+w _` | Maximize height |
| `Ctrl+w \|` | Maximize width |

### Close Windows

| Command | Action |
|---------|--------|
| `:q` | Close current window |
| `:qa` | Close all windows |
| `Ctrl+w c` | Close current window |
| `Ctrl+w o` | Close all except current |

---

## Essential Commands

### Navigation

| Key | Action |
|-----|--------|
| `h j k l` | Left, Down, Up, Right |
| `w` / `b` | Next/previous word |
| `0` / `$` | Start/end of line |
| `gg` / `G` | Start/end of file |
| `Ctrl+d/u` | Page down/up |
| `:<n>` | Go to line n |

### Editing

| Key | Action |
|-----|--------|
| `i` | Insert before cursor |
| `a` | Insert after cursor |
| `o` | New line below |
| `O` | New line above |
| `x` | Delete character |
| `dd` | Delete line |
| `yy` | Yank (copy) line |
| `p` | Paste after cursor |
| `u` | Undo |
| `Ctrl+r` | Redo |

### Search & Replace

| Command | Action |
|---------|--------|
| `/pattern` | Search forward |
| `?pattern` | Search backward |
| `n` / `N` | Next/previous match |
| `:%s/old/new/g` | Replace all |
| `:%s/old/new/gc` | Replace with confirmation |

### File Operations

| Command | Action |
|---------|--------|
| `:w` | Save |
| `:q` | Quit |
| `:wq` or `:x` | Save and quit |
| `:q!` | Quit without saving |
| `:e filename` | Open file |
| `:r filename` | Insert file content |

---

## Useful Settings

Add to `~/.vimrc`:

```vim
" Basic settings
set number          " Show line numbers
set relativenumber  " Relative line numbers
set tabstop=4       " Tab width
set shiftwidth=4    " Indent width
set expandtab       " Spaces instead of tabs
set autoindent      " Auto indentation
set smartindent     " Smart indentation

" Search
set hlsearch        " Highlight search
set incsearch       " Incremental search
set ignorecase      " Case insensitive
set smartcase       " Case sensitive if uppercase

" UI
set cursorline      " Highlight current line
set showmatch       " Show matching brackets
set wildmenu        " Command completion menu
syntax on           " Syntax highlighting
```

---

## Related Documentation

- [Tmux Guide](tmux.md)
- [Linux Commands](linux-commands.md)
