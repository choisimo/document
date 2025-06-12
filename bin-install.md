Arch Linux에서 tar.xz 파일로 응용 프로그램 설치 방법

Arch Linux에서 tar.xz 파일로 된 응용 프로그램을 설치하는 방법은 크게 두 가지로 나뉩니다.

    소스 코드(tar.xz)를 컴파일하여 설치하는 방법: 가장 일반적인 경우입니다. 개발자가 배포한 소스 코드를 직접 시스템에서 빌드하고 설치합니다.
    미리 컴파일된 바이너리(tar.xz)를 설치하는 방법: 개발자가 이미 컴파일을 완료한 실행 파일을 압축하여 배포하는 경우입니다.

두 가지 경우 모두 Arch Linux의 패키지 매니저인 pacman으로 관리되지 않으므로, 설치된 파일 목록을 직접 추적하고 삭제도 수동으로 해야 하는 단점이 있습니다.

가장 권장되는 방법은 Arch User Repository(AUR)에 해당 패키지가 있는지 확인하고 yay나 paru 같은 AUR 헬퍼를 사용하거나, PKGBUILD를 직접 작성하여 makepkg로 pacman이 설치할 수 있는 패키지(*.pkg.tar.zst)를 만드는 것입니다. 하지만 여기서는 tar.xz 파일을 직접 다루는 방법을 설명합니다.
방법 1: 소스 코드를 직접 컴파일하여 설치하기 (./configure, make, make install)

이것이 가장 전통적이고 일반적인 방법입니다. gcc, make와 같은 빌드 도구가 필요합니다.
1단계: 필수 도구 설치

컴파일에 필요한 기본 도구 그룹인 base-devel을 설치합니다. 이 그룹에는 gcc, make, autoconf 등이 포함되어 있습니다.
Bash

sudo pacman -Syu base-devel

2단계: tar.xz 파일 압축 해제

다운로드한 tar.xz 파일의 압축을 풉니다. 일반적으로 ~/build와 같은 별도의 디렉터리를 만들어 관리하는 것이 좋습니다.
Bash

# 'application-1.2.3.tar.xz'를 예시로 사용
tar -xvf application-1.2.3.tar.xz

    x: 압축 풀기 (extract)
    v: 처리되는 파일 목록 보기 (verbose)
    f: 파일 지정 (file)

3단계: 소스 디렉터리로 이동 및 README/INSTALL 확인

압축이 풀리면 생성된 디렉터리로 이동합니다. 가장 중요한 단계는 README나 INSTALL 파일을 읽어보는 것입니다. 이 파일들에는 개발자가 명시한 정확한 빌드 방법과 의존성 패키지 목록이 들어있습니다.
Bash

cd application-1.2.3
less README.md
less INSTALL

4단계: Configure 스크립트 실행

configure 스크립트는 시스템의 환경을 확인하고, 필요한 라이브러리가 있는지 검사하며, 설치 경로 등을 설정하는 Makefile을 생성합니다.
Bash

./configure --prefix=/usr/local

    --prefix=/usr/local: 프로그램을 설치할 기본 경로를 지정합니다. /usr/local은 시스템 패키지 매니저가 관리하는 /usr과 충돌하지 않아 수동 설치에 권장되는 경로입니다. 지정하지 않으면 보통 /usr에 설치됩니다.

이 단계에서 "library not found" 같은 오류가 발생하면, 오류 메시지에 나온 라이브러리나 개발 패키지(-dev 또는 -devel 접미사가 붙는)를 pacman으로 설치해야 합니다.
5단계: 컴파일 (Compile)

Makefile이 성공적으로 생성되었다면, make 명령어로 소스 코드를 컴파일합니다.
Bash

make

컴퓨터의 모든 CPU 코어를 사용하여 컴파일 속도를 높일 수 있습니다.
Bash

# nproc은 사용 가능한 프로세서 수를 출력하는 명령어입니다.
make -j$(nproc)

6단계: 설치 (Install)

컴파일이 오류 없이 완료되면, 생성된 파일들을 configure 단계에서 지정한 경로로 복사하여 설치합니다. 관리자 권한이 필요합니다.
Bash

sudo make install

제거 방법

pacman으로 관리되지 않으므로, 제거하려면 소스 코드 디렉터리에서 uninstall 명령을 지원하는지 확인해야 합니다.
Bash

# 소스 코드 디렉터리에서 실행
sudo make uninstall

만약 make uninstall을 지원하지 않는다면, make install 실행 시 어떤 파일이 어디에 복사되었는지 출력을 기록해두었다가 수동으로 삭제해야 합니다. 이것이 수동 설치의 가장 큰 단점입니다.
방법 2: 미리 컴파일된 바이너리 설치하기

이 경우는 훨씬 간단합니다. 압축을 풀고 적절한 위치로 파일을 복사하기만 하면 됩니다. Firefox 개발자 버전 등이 이런 방식으로 배포됩니다.
1단계: tar.xz 파일 압축 해제
Bash

# 'application-binary.tar.xz'를 예시로 사용
tar -xvf application-binary.tar.xz

2단계: 적절한 위치로 디렉터리 이동

미리 컴파일된 프로그램은 시스템 디렉터리(/usr/bin, /usr/lib 등)에 직접 섞기보다, /opt나 /usr/local 디렉터리 아래에 두는 것이 일반적입니다.
Bash

# 압축 해제된 'application' 디렉터리를 /opt로 이동
sudo mv application /opt/

3단계: 심볼릭 링크 생성 (PATH 연결)

프로그램을 터미널 어디서든 실행할 수 있도록, 실행 파일을 PATH 환경 변수에 잡혀있는 디렉터리(예: /usr/local/bin)에 심볼릭 링크로 연결합니다.
Bash

# 예: /opt/application/app-binary 라는 실행 파일이 있을 경우
sudo ln -s /opt/application/app-binary /usr/local/bin/app-binary

이제 터미널에서 app-binary 명령어로 프로그램을 실행할 수 있습니다.
4단계: .desktop 파일 생성 (선택 사항)

GUI 응용 프로그램이라면, 바탕화면 환경의 메뉴에 표시되도록 .desktop 파일을 직접 만들어야 합니다.

    ~/.local/share/applications/ 또는 /usr/share/applications/ 디렉터리에 app-name.desktop 파일을 생성합니다.

    아래와 같은 형식으로 내용을 채웁니다.
    Ini, TOML

    # /usr/share/applications/my-app.desktop

    [Desktop Entry]
    Name=My Application
    Comment=Description of my application
    Exec=/opt/application/app-binary
    Icon=/opt/application/icon.png
    Terminal=false
    Type=Application
    Categories=Utility;

    Exec: 실행 파일의 전체 경로
    Icon: 아이콘 파일의 전체 경로
    Categories: 프로그램 메뉴에서 표시될 카테고리

제거 방법

설치 시 복사했던 디렉터리와 심볼릭 링크, .desktop 파일을 수동으로 삭제하면 됩니다.
Bash

# 심볼릭 링크 삭제
sudo rm /usr/local/bin/app-binary

# 프로그램 디렉터리 삭제
sudo rm -rf /opt/application

# .desktop 파일 삭제
sudo rm /usr/share/applications/my-app.desktop

nopc% tree -d ./Windsurf 

./Windsurf

├── bin

├── locales

└── resources

    ├── app

    │   ├── extensions

    │   │   ├── bat

    │   │   │   ├── snippets

    │   │   │   └── syntaxes

    │   │   ├── clojure

    │   │   │   └── syntaxes

    │   │   ├── coffeescript

    │   │   │   ├── snippets

    │   │   │   └── syntaxes

    │   │   ├── configuration-editing

    │   │   │   ├── dist

    │   │   │   ├── images

    │   │   │   └── schemas

    │   │   ├── cpp

    │   │   │   ├── snippets

    │   │   │   └── syntaxes

    │   │   ├── csharp

    │   │   │   ├── snippets

    │   │   │   └── syntaxes

    │   │   ├── css

    │   │   │   └── syntaxes

    │   │   ├── css-language-features

    │   │   │   ├── client

    │   │   │   │   └── dist

    │   │   │   │       └── node

    │   │   │   ├── icons

    │   │   │   ├── schemas

    │   │   │   └── server

    │   │   │       └── dist

    │   │   │           └── node

    │   │   ├── dart

    │   │   │   └── syntaxes

    │   │   ├── debug-auto-launch

    │   │   │   ├── dist

    │   │   │   └── media

    │   │   ├── debug-server-ready

    │   │   │   ├── dist

    │   │   │   └── media

    │   │   ├── diff

    │   │   │   └── syntaxes

    │   │   ├── docker

    │   │   │   └── syntaxes

    │   │   ├── emmet

    │   │   │   ├── dist

    │   │   │   │   └── node

    │   │   │   └── images

    │   │   ├── extension-editing

    │   │   │   ├── dist

    │   │   │   └── images

    │   │   ├── fsharp

    │   │   │   ├── snippets

    │   │   │   └── syntaxes

    │   │   ├── git

    │   │   │   ├── dist

    │   │   │   └── resources

    │   │   │       └── icons

    │   │   │           ├── dark

    │   │   │           └── light

    │   │   ├── git-base

    │   │   │   ├── dist

    │   │   │   ├── languages

    │   │   │   ├── resources

    │   │   │   │   └── icons

    │   │   │   └── syntaxes

    │   │   ├── github

    │   │   │   ├── dist

    │   │   │   ├── images

    │   │   │   └── testWorkspace

    │   │   │       ├── PULL_REQUEST_TEMPLATE

    │   │   │       └── docs

    │   │   │           └── PULL_REQUEST_TEMPLATE

    │   │   ├── github-authentication

    │   │   │   ├── dist

    │   │   │   ├── images

    │   │   │   └── media

    │   │   ├── go

    │   │   │   └── syntaxes

    │   │   ├── groovy

    │   │   │   ├── snippets

    │   │   │   └── syntaxes

    │   │   ├── grunt

    │   │   │   ├── dist

    │   │   │   └── images

    │   │   ├── gulp

    │   │   │   ├── dist

    │   │   │   └── images

    │   │   ├── handlebars

    │   │   │   └── syntaxes

    │   │   ├── hlsl

    │   │   │   └── syntaxes

    │   │   ├── html

    │   │   │   ├── snippets

    │   │   │   └── syntaxes

    │   │   ├── html-language-features

    │   │   │   ├── client

    │   │   │   │   └── dist

    │   │   │   │       └── node

    │   │   │   ├── icons

    │   │   │   ├── schemas

    │   │   │   └── server

    │   │   │       ├── dist

    │   │   │       │   └── node

    │   │   │       └── lib

    │   │   ├── ini

    │   │   │   └── syntaxes

    │   │   ├── ipynb

    │   │   │   ├── dist

    │   │   │   ├── media

    │   │   │   └── notebook-out

    │   │   ├── jake

    │   │   │   ├── dist

    │   │   │   └── images

    │   │   ├── java

    │   │   │   ├── snippets

    │   │   │   └── syntaxes

    │   │   ├── javascript

    │   │   │   ├── snippets

    │   │   │   └── syntaxes

    │   │   ├── json

    │   │   │   └── syntaxes

    │   │   ├── json-language-features

    │   │   │   ├── client

    │   │   │   │   └── dist

    │   │   │   │       └── node

    │   │   │   ├── icons

    │   │   │   └── server

    │   │   │       └── dist

    │   │   │           └── node

    │   │   ├── julia

    │   │   │   └── syntaxes

    │   │   ├── latex

    │   │   │   └── syntaxes

    │   │   ├── less

    │   │   │   ├── build

    │   │   │   └── syntaxes

    │   │   ├── log

    │   │   │   └── syntaxes

    │   │   ├── lua

    │   │   │   └── syntaxes

    │   │   ├── make

    │   │   │   └── syntaxes

    │   │   ├── markdown-basics

    │   │   │   ├── snippets

    │   │   │   └── syntaxes

    │   │   ├── markdown-language-features

    │   │   │   ├── dist

    │   │   │   ├── media

    │   │   │   ├── notebook-out

    │   │   │   └── schemas

    │   │   ├── markdown-math

    │   │   │   ├── dist

    │   │   │   ├── notebook-out

    │   │   │   │   └── fonts

    │   │   │   ├── preview-styles

    │   │   │   └── syntaxes

    │   │   ├── media-preview

    │   │   │   ├── dist

    │   │   │   └── media

    │   │   ├── merge-conflict

    │   │   │   ├── dist

    │   │   │   └── media

    │   │   ├── microsoft-authentication

    │   │   │   ├── dist

    │   │   │   └── media

    │   │   ├── ms-vscode.js-debug

    │   │   │   ├── resources

    │   │   │   │   ├── dark

    │   │   │   │   ├── light

    │   │   │   │   └── readme

    │   │   │   └── src

    │   │   │       ├── targets

    │   │   │       │   └── node

    │   │   │       ├── ui

    │   │   │       └── vendor

    │   │   ├── ms-vscode.js-debug-companion

    │   │   │   ├── out

    │   │   │   └── resources

    │   │   ├── ms-vscode.vscode-js-profile-table

    │   │   │   ├── out

    │   │   │   └── resources

    │   │   ├── node_modules

    │   │   │   └── typescript

    │   │   │       └── lib

    │   │   │           ├── cs

    │   │   │           ├── de

    │   │   │           ├── es

    │   │   │           ├── fr

    │   │   │           ├── it

    │   │   │           ├── ja

    │   │   │           ├── ko

    │   │   │           ├── pl

    │   │   │           ├── pt-br

    │   │   │           ├── ru

    │   │   │           ├── tr

    │   │   │           ├── zh-cn

    │   │   │           └── zh-tw

    │   │   ├── notebook-renderers

    │   │   │   ├── media

    │   │   │   └── renderer-out

    │   │   ├── npm

    │   │   │   ├── dist

    │   │   │   └── images

    │   │   ├── objective-c

    │   │   │   └── syntaxes

    │   │   ├── perl

    │   │   │   └── syntaxes

    │   │   ├── php

    │   │   │   ├── snippets

    │   │   │   └── syntaxes

    │   │   ├── php-language-features

    │   │   │   ├── dist

    │   │   │   └── icons

    │   │   ├── powershell

    │   │   │   └── syntaxes

    │   │   ├── pug

    │   │   │   └── syntaxes

    │   │   ├── python

    │   │   │   └── syntaxes

    │   │   ├── r

    │   │   │   └── syntaxes

    │   │   ├── razor

    │   │   │   ├── build

    │   │   │   └── syntaxes

    │   │   ├── references-view

    │   │   │   ├── dist

    │   │   │   └── media

    │   │   ├── restructuredtext

    │   │   │   └── syntaxes

    │   │   ├── ruby

    │   │   │   └── syntaxes

    │   │   ├── rust

    │   │   │   ├── build

    │   │   │   └── syntaxes

    │   │   ├── scss

    │   │   │   └── syntaxes

    │   │   ├── search-result

    │   │   │   ├── dist

    │   │   │   │   └── media

    │   │   │   ├── images

    │   │   │   └── syntaxes

    │   │   ├── shaderlab

    │   │   │   └── syntaxes

    │   │   ├── shellscript

    │   │   │   └── syntaxes

    │   │   ├── simple-browser

    │   │   │   ├── dist

    │   │   │   └── media

    │   │   ├── sql

    │   │   │   └── syntaxes

    │   │   ├── swift

    │   │   │   ├── snippets

    │   │   │   └── syntaxes

    │   │   ├── terminal-suggest

    │   │   │   └── dist

    │   │   │       ├── fig

    │   │   │       └── media

    │   │   ├── theme-abyss

    │   │   │   └── themes

    │   │   ├── theme-defaults

    │   │   │   ├── fileicons

    │   │   │   │   └── images

    │   │   │   └── themes

    │   │   ├── theme-kimbie-dark

    │   │   │   └── themes

    │   │   ├── theme-monokai

    │   │   │   └── themes

    │   │   ├── theme-monokai-dimmed

    │   │   │   └── themes

    │   │   ├── theme-quietlight

    │   │   │   └── themes

    │   │   ├── theme-red

    │   │   │   └── themes

    │   │   ├── theme-seti

    │   │   │   └── icons

    │   │   ├── theme-solarized-dark

    │   │   │   └── themes

    │   │   ├── theme-solarized-light

    │   │   │   └── themes

    │   │   ├── theme-symbols

    │   │   │   └── src

    │   │   │       └── icons

    │   │   │           ├── files

    │   │   │           └── folders

    │   │   ├── theme-synthwave

    │   │   │   └── themes

    │   │   ├── theme-tokyo-night

    │   │   │   └── themes

    │   │   ├── theme-tomorrow-night-blue

    │   │   │   └── themes

    │   │   ├── tunnel-forwarding

    │   │   │   ├── dist

    │   │   │   └── media

    │   │   ├── typescript-basics

    │   │   │   ├── snippets

    │   │   │   └── syntaxes

    │   │   ├── typescript-language-features

    │   │   │   ├── dist

    │   │   │   ├── media

    │   │   │   ├── resources

    │   │   │   │   └── walkthroughs

    │   │   │   └── schemas

    │   │   ├── vb

    │   │   │   ├── snippets

    │   │   │   └── syntaxes

    │   │   ├── windsurf

    │   │   │   ├── bin

    │   │   │   ├── customEditor

    │   │   │   │   └── media

    │   │   │   │       ├── ruleEditor

    │   │   │   │       └── workflowEditor

    │   │   │   ├── dist

    │   │   │   │   └── panel

    │   │   │   │       └── chat

    │   │   │   ├── out

    │   │   │   │   └── media

    │   │   │   └── schemas

    │   │   ├── windsurf-dev-containers

    │   │   │   ├── dist

    │   │   │   │   └── @devcontainers

    │   │   │   │       └── cli

    │   │   │   │           ├── dist

    │   │   │   │           │   └── spec-node

    │   │   │   │           └── scripts

    │   │   │   └── scripts

    │   │   ├── windsurf-remote-openssh

    │   │   │   ├── dist

    │   │   │   ├── media

    │   │   │   └── scripts

    │   │   ├── windsurf-remote-wsl

    │   │   │   └── dist

    │   │   ├── xml

    │   │   │   └── syntaxes

    │   │   └── yaml

    │   │       ├── build

    │   │       └── syntaxes

    │   ├── node_modules

    │   │   ├── @bufbuild

    │   │   │   └── protobuf

    │   │   │       └── dist

    │   │   │           ├── cjs

    │   │   │           │   ├── google

    │   │   │           │   │   └── protobuf

    │   │   │           │   │       └── compiler

    │   │   │           │   └── private

    │   │   │           └── esm

    │   │   │               ├── google

    │   │   │               │   └── protobuf

    │   │   │               │       └── compiler

    │   │   │               └── private

    │   │   ├── @c4312

    │   │   │   └── eventsource-umd

    │   │   │       └── dist

    │   │   ├── @isaacs

    │   │   │   └── cliui

    │   │   │       ├── build

    │   │   │       │   └── lib

    │   │   │       └── node_modules

    │   │   │           ├── ansi-regex

    │   │   │           ├── ansi-styles

    │   │   │           ├── emoji-regex

    │   │   │           │   └── es2015

    │   │   │           ├── string-width

    │   │   │           ├── strip-ansi

    │   │   │           └── wrap-ansi

    │   │   ├── @microsoft

    │   │   │   ├── 1ds-core-js

    │   │   │   │   ├── bundle

    │   │   │   │   ├── dist

    │   │   │   │   └── dist-esm

    │   │   │   │       └── src

    │   │   │   ├── 1ds-post-js

    │   │   │   │   ├── bundle

    │   │   │   │   ├── dist

    │   │   │   │   └── dist-esm

    │   │   │   │       └── src

    │   │   │   │           └── typings

    │   │   │   ├── applicationinsights-core-js

    │   │   │   │   ├── browser

    │   │   │   │   ├── dist

    │   │   │   │   ├── dist-esm

    │   │   │   │   │   ├── JavaScriptSDK

    │   │   │   │   │   ├── JavaScriptSDK.Enums

    │   │   │   │   │   └── JavaScriptSDK.Interfaces

    │   │   │   │   └── types

    │   │   │   ├── applicationinsights-shims

    │   │   │   │   ├── browser

    │   │   │   │   ├── dist

    │   │   │   │   │   ├── esm

    │   │   │   │   │   └── umd

    │   │   │   │   └── dist-esm

    │   │   │   └── dynamicproto-js

    │   │   │       ├── lib

    │   │   │       │   └── dist

    │   │   │       │       ├── amd

    │   │   │       │       ├── cjs

    │   │   │       │       ├── esm

    │   │   │       │       ├── iife

    │   │   │       │       ├── node

    │   │   │       │       ├── system

    │   │   │       │       └── umd

    │   │   │       └── tools

    │   │   │           └── rollup

    │   │   │               ├── esm

    │   │   │               └── node

    │   │   ├── @npmcli

    │   │   │   ├── agent

    │   │   │   │   ├── lib

    │   │   │   │   └── node_modules

    │   │   │   │       └── lru-cache

    │   │   │   │           └── dist

    │   │   │   │               ├── commonjs

    │   │   │   │               └── esm

    │   │   │   └── fs

    │   │   │       └── lib

    │   │   │           ├── common

    │   │   │           └── cp

    │   │   ├── @parcel

    │   │   │   └── watcher

    │   │   │       ├── build

    │   │   │       │   └── Release

    │   │   │       ├── node_modules

    │   │   │       │   └── detect-libc

    │   │   │       │       ├── bin

    │   │   │       │       └── lib

    │   │   │       └── scripts

    │   │   ├── @pkgjs

    │   │   │   └── parseargs

    │   │   │       └── internal

    │   │   ├── @tootallnate

    │   │   │   └── once

    │   │   │       └── dist

    │   │   ├── @types

    │   │   │   ├── color-name

    │   │   │   └── semver

    │   │   ├── @vscode

    │   │   │   ├── deviceid

    │   │   │   │   ├── azure-pipelines

    │   │   │   │   ├── build

    │   │   │   │   │   └── Release

    │   │   │   │   └── dist

    │   │   │   ├── iconv-lite-umd

    │   │   │   │   └── lib

    │   │   │   ├── policy-watcher

    │   │   │   │   └── build

    │   │   │   │       └── Release

    │   │   │   ├── proxy-agent

    │   │   │   │   └── out

    │   │   │   ├── ripgrep

    │   │   │   │   ├── bin

    │   │   │   │   ├── build

    │   │   │   │   ├── lib

    │   │   │   │   └── node_modules

    │   │   │   │       └── yauzl

    │   │   │   ├── spdlog

    │   │   │   │   ├── azure-pipelines

    │   │   │   │   └── build

    │   │   │   │       └── Release

    │   │   │   ├── sqlite3

    │   │   │   │   ├── build

    │   │   │   │   │   └── Release

    │   │   │   │   └── lib

    │   │   │   ├── sudo-prompt

    │   │   │   ├── tree-sitter-wasm

    │   │   │   │   └── wasm

    │   │   │   ├── vscode-languagedetection

    │   │   │   │   ├── cli

    │   │   │   │   ├── dist

    │   │   │   │   │   └── lib

    │   │   │   │   └── model

    │   │   │   └── windows-mutex

    │   │   ├── @xterm

    │   │   │   ├── addon-clipboard

    │   │   │   │   └── lib

    │   │   │   ├── addon-image

    │   │   │   │   ├── lib

    │   │   │   │   └── out

    │   │   │   ├── addon-ligatures

    │   │   │   │   └── lib

    │   │   │   ├── addon-progress

    │   │   │   │   └── lib

    │   │   │   ├── addon-search

    │   │   │   │   └── lib

    │   │   │   ├── addon-serialize

    │   │   │   │   └── lib

    │   │   │   ├── addon-unicode11

    │   │   │   │   └── lib

    │   │   │   ├── addon-webgl

    │   │   │   │   └── lib

    │   │   │   ├── headless

    │   │   │   │   └── lib-headless

    │   │   │   └── xterm

    │   │   │       ├── css

    │   │   │       └── lib

    │   │   ├── agent-base

    │   │   │   └── dist

    │   │   ├── aggregate-error

    │   │   ├── ansi-regex

    │   │   ├── ansi-styles

    │   │   ├── balanced-match

    │   │   ├── base64-js

    │   │   ├── bindings

    │   │   ├── bl

    │   │   ├── braces

    │   │   │   └── lib

    │   │   ├── buffer

    │   │   ├── buffer-crc32

    │   │   ├── cacache

    │   │   │   ├── lib

    │   │   │   │   ├── content

    │   │   │   │   └── util

    │   │   │   └── node_modules

    │   │   │       ├── brace-expansion

    │   │   │       ├── fs-minipass

    │   │   │       │   └── lib

    │   │   │       ├── glob

    │   │   │       │   └── dist

    │   │   │       │       ├── commonjs

    │   │   │       │       └── esm

    │   │   │       ├── jackspeak

    │   │   │       │   └── dist

    │   │   │       │       ├── commonjs

    │   │   │       │       └── esm

    │   │   │       ├── lru-cache

    │   │   │       │   └── dist

    │   │   │       │       ├── commonjs

    │   │   │       │       └── esm

    │   │   │       ├── minimatch

    │   │   │       │   └── dist

    │   │   │       │       ├── commonjs

    │   │   │       │       └── esm

    │   │   │       ├── minipass

    │   │   │       │   └── dist

    │   │   │       │       ├── commonjs

    │   │   │       │       └── esm

    │   │   │       └── p-map

    │   │   ├── chownr

    │   │   ├── chrome-remote-interface

    │   │   │   ├── bin

    │   │   │   ├── lib

    │   │   │   └── node_modules

    │   │   │       ├── commander

    │   │   │       └── ws

    │   │   │           └── lib

    │   │   ├── clean-stack

    │   │   ├── color-convert

    │   │   ├── color-name

    │   │   ├── cross-spawn

    │   │   │   └── lib

    │   │   │       └── util

    │   │   ├── debug

    │   │   │   └── src

    │   │   ├── decompress-response

    │   │   │   └── node_modules

    │   │   │       └── mimic-response

    │   │   ├── deep-extend

    │   │   │   └── lib

    │   │   ├── define-lazy-prop

    │   │   ├── detect-libc

    │   │   │   └── lib

    │   │   ├── diff

    │   │   │   ├── dist

    │   │   │   └── lib

    │   │   │       ├── convert

    │   │   │       ├── diff

    │   │   │       ├── patch

    │   │   │       └── util

    │   │   ├── eastasianwidth

    │   │   ├── encoding

    │   │   │   ├── lib

    │   │   │   └── node_modules

    │   │   │       └── iconv-lite

    │   │   │           ├── encodings

    │   │   │           │   └── tables

    │   │   │           └── lib

    │   │   ├── end-of-stream

    │   │   ├── err-code

    │   │   ├── eventsource-parser

    │   │   │   └── dist

    │   │   ├── expand-template

    │   │   ├── fd-slicer

    │   │   ├── file-uri-to-path

    │   │   ├── fill-range

    │   │   ├── font-finder

    │   │   │   └── dist

    │   │   │       └── tables

    │   │   ├── font-ligatures

    │   │   │   ├── dist

    │   │   │   │   └── processors

    │   │   │   └── node_modules

    │   │   │       ├── lru-cache

    │   │   │       └── yallist

    │   │   ├── foreground-child

    │   │   │   └── dist

    │   │   │       ├── cjs

    │   │   │       └── mjs

    │   │   ├── fs-constants

    │   │   ├── fs-extra

    │   │   │   └── lib

    │   │   │       ├── copy

    │   │   │       ├── empty

    │   │   │       ├── ensure

    │   │   │       ├── fs

    │   │   │       ├── json

    │   │   │       ├── mkdirs

    │   │   │       ├── move

    │   │   │       ├── output-file

    │   │   │       ├── path-exists

    │   │   │       ├── remove

    │   │   │       └── util

    │   │   ├── fs-minipass

    │   │   │   └── node_modules

    │   │   │       ├── minipass

    │   │   │       └── yallist

    │   │   ├── get-system-fonts

    │   │   │   └── dist

    │   │   ├── github-from-package

    │   │   ├── graceful-fs

    │   │   ├── http-cache-semantics

    │   │   ├── http-proxy-agent

    │   │   │   └── dist

    │   │   ├── https-proxy-agent

    │   │   │   └── dist

    │   │   ├── ieee754

    │   │   ├── imurmurhash

    │   │   ├── indent-string

    │   │   ├── inherits

    │   │   ├── ini

    │   │   ├── ip-address

    │   │   │   └── dist

    │   │   │       ├── v4

    │   │   │       └── v6

    │   │   ├── is-docker

    │   │   ├── is-extglob

    │   │   ├── is-fullwidth-code-point

    │   │   ├── is-glob

    │   │   ├── is-lambda

    │   │   ├── is-number

    │   │   ├── is-wsl

    │   │   ├── isexe

    │   │   ├── js-base64

    │   │   ├── jsbn

    │   │   ├── jschardet

    │   │   │   ├── dist

    │   │   │   └── scripts

    │   │   ├── jsonc-parser

    │   │   │   └── lib

    │   │   │       ├── esm

    │   │   │       │   └── impl

    │   │   │       └── umd

    │   │   │           └── impl

    │   │   ├── jsonfile

    │   │   ├── kerberos

    │   │   │   ├── build

    │   │   │   │   └── Release

    │   │   │   │       └── obj.target

    │   │   │   └── lib

    │   │   │       └── auth_processes

    │   │   ├── make-fetch-happen

    │   │   │   ├── lib

    │   │   │   │   └── cache

    │   │   │   └── node_modules

    │   │   │       ├── minipass

    │   │   │       │   └── dist

    │   │   │       │       ├── commonjs

    │   │   │       │       └── esm

    │   │   │       └── negotiator

    │   │   │           └── lib

    │   │   ├── micromatch

    │   │   ├── minimist

    │   │   ├── minipass

    │   │   ├── minipass-collect

    │   │   │   └── node_modules

    │   │   │       └── minipass

    │   │   │           └── dist

    │   │   │               ├── commonjs

    │   │   │               └── esm

    │   │   ├── minipass-fetch

    │   │   │   ├── lib

    │   │   │   └── node_modules

    │   │   │       └── minipass

    │   │   │           └── dist

    │   │   │               ├── commonjs

    │   │   │               └── esm

    │   │   ├── minipass-flush

    │   │   │   └── node_modules

    │   │   │       ├── minipass

    │   │   │       └── yallist

    │   │   ├── minipass-pipeline

    │   │   │   └── node_modules

    │   │   │       ├── minipass

    │   │   │       └── yallist

    │   │   ├── minipass-sized

    │   │   │   └── node_modules

    │   │   │       ├── minipass

    │   │   │       └── yallist

    │   │   ├── minizlib

    │   │   │   └── node_modules

    │   │   │       ├── minipass

    │   │   │       └── yallist

    │   │   ├── mkdirp

    │   │   │   ├── bin

    │   │   │   └── lib

    │   │   ├── mkdirp-classic

    │   │   ├── ms

    │   │   ├── murmurhash3js

    │   │   │   └── lib

    │   │   ├── napi-build-utils

    │   │   ├── native-is-elevated

    │   │   │   ├── build

    │   │   │   │   └── Release

    │   │   │   └── tst

    │   │   ├── native-keymap

    │   │   │   └── build

    │   │   │       └── Release

    │   │   ├── native-watchdog

    │   │   │   └── build

    │   │   │       └── Release

    │   │   ├── node-abi

    │   │   │   └── scripts

    │   │   ├── node-pty

    │   │   │   ├── build

    │   │   │   │   └── Release

    │   │   │   ├── lib

    │   │   │   │   ├── shared

    │   │   │   │   └── worker

    │   │   │   └── node-addon-api

    │   │   ├── once

    │   │   ├── open

    │   │   ├── opentype.js

    │   │   │   ├── bin

    │   │   │   ├── dist

    │   │   │   ├── externs

    │   │   │   └── src

    │   │   │       └── tables

    │   │   ├── package-json-from-dist

    │   │   │   └── dist

    │   │   │       ├── commonjs

    │   │   │       └── esm

    │   │   ├── path-key

    │   │   ├── path-scurry

    │   │   │   ├── dist

    │   │   │   │   ├── commonjs

    │   │   │   │   └── esm

    │   │   │   └── node_modules

    │   │   │       └── lru-cache

    │   │   │           └── dist

    │   │   │               ├── commonjs

    │   │   │               └── esm

    │   │   ├── pend

    │   │   ├── picomatch

    │   │   │   └── lib

    │   │   ├── preact

    │   │   │   ├── compat

    │   │   │   │   ├── dist

    │   │   │   │   └── src

    │   │   │   ├── debug

    │   │   │   │   ├── dist

    │   │   │   │   └── src

    │   │   │   ├── devtools

    │   │   │   │   ├── dist

    │   │   │   │   └── src

    │   │   │   ├── dist

    │   │   │   ├── hooks

    │   │   │   │   ├── dist

    │   │   │   │   └── src

    │   │   │   ├── jsx-runtime

    │   │   │   │   ├── dist

    │   │   │   │   └── src

    │   │   │   ├── src

    │   │   │   │   └── diff

    │   │   │   └── test-utils

    │   │   │       ├── dist

    │   │   │       └── src

    │   │   ├── proc-log

    │   │   │   └── lib

    │   │   ├── promise-retry

    │   │   ├── promise-stream-reader

    │   │   │   └── dist

    │   │   ├── proxy-from-env

    │   │   ├── rc

    │   │   │   ├── lib

    │   │   │   └── node_modules

    │   │   │       └── strip-json-comments

    │   │   ├── readable-stream

    │   │   │   └── lib

    │   │   │       └── internal

    │   │   │           └── streams

    │   │   ├── retry

    │   │   │   └── lib

    │   │   ├── safe-buffer

    │   │   ├── safer-buffer

    │   │   ├── semver

    │   │   │   ├── bin

    │   │   │   ├── classes

    │   │   │   ├── functions

    │   │   │   ├── internal

    │   │   │   └── ranges

    │   │   ├── shebang-command

    │   │   ├── shebang-regex

    │   │   ├── signal-exit

    │   │   │   └── dist

    │   │   │       ├── cjs

    │   │   │       └── mjs

    │   │   ├── simple-concat

    │   │   ├── simple-get

    │   │   ├── smart-buffer

    │   │   │   └── build

    │   │   ├── socks

    │   │   │   └── build

    │   │   │       ├── client

    │   │   │       └── common

    │   │   ├── socks-proxy-agent

    │   │   │   └── dist

    │   │   ├── sprintf-js

    │   │   │   ├── dist

    │   │   │   └── src

    │   │   ├── ssri

    │   │   │   ├── lib

    │   │   │   └── node_modules

    │   │   │       └── minipass

    │   │   │           └── dist

    │   │   │               ├── commonjs

    │   │   │               └── esm

    │   │   ├── string-width-cjs

    │   │   │   └── node_modules

    │   │   │       └── emoji-regex

    │   │   │           └── es2015

    │   │   ├── string_decoder

    │   │   │   └── lib

    │   │   ├── strip-ansi

    │   │   ├── strip-ansi-cjs

    │   │   ├── tar

    │   │   │   ├── lib

    │   │   │   └── node_modules

    │   │   │       └── yallist

    │   │   ├── tas-client-umd

    │   │   │   └── lib

    │   │   ├── tiny-inflate

    │   │   ├── to-regex-range

    │   │   ├── tslib

    │   │   │   └── modules

    │   │   ├── tunnel-agent

    │   │   ├── undici

    │   │   │   ├── lib

    │   │   │   │   ├── api

    │   │   │   │   ├── cache

    │   │   │   │   ├── core

    │   │   │   │   ├── dispatcher

    │   │   │   │   ├── handler

    │   │   │   │   ├── interceptor

    │   │   │   │   ├── llhttp

    │   │   │   │   ├── mock

    │   │   │   │   ├── util

    │   │   │   │   └── web

    │   │   │   │       ├── cache

    │   │   │   │       ├── cookies

    │   │   │   │       ├── eventsource

    │   │   │   │       ├── fetch

    │   │   │   │       └── websocket

    │   │   │   │           └── stream

    │   │   │   └── scripts

    │   │   ├── unique-filename

    │   │   │   └── lib

    │   │   ├── unique-slug

    │   │   │   └── lib

    │   │   ├── universalify

    │   │   ├── unleash-client

    │   │   │   └── lib

    │   │   │       ├── repository

    │   │   │       └── strategy

    │   │   ├── util-deprecate

    │   │   ├── uuid

    │   │   │   └── dist

    │   │   │       ├── bin

    │   │   │       ├── commonjs-browser

    │   │   │       ├── esm-browser

    │   │   │       └── esm-node

    │   │   ├── v8-inspect-profiler

    │   │   ├── vscode-oniguruma

    │   │   │   └── release

    │   │   ├── vscode-regexpp

    │   │   ├── vscode-textmate

    │   │   │   └── release

    │   │   ├── which

    │   │   │   └── bin

    │   │   ├── windows-foreground-love

    │   │   │   └── build

    │   │   │       └── Release

    │   │   │           └── obj.target

    │   │   ├── wrap-ansi-cjs

    │   │   │   └── node_modules

    │   │   │       ├── emoji-regex

    │   │   │       │   └── es2015

    │   │   │       └── string-width

    │   │   ├── wrappy

    │   │   ├── yauzl

    │   │   └── yazl

    │   ├── out

    │   │   ├── media

    │   │   ├── vs

    │   │   │   ├── base

    │   │   │   │   ├── node

    │   │   │   │   └── parts

    │   │   │   │       └── sandbox

    │   │   │   │           └── electron-sandbox

    │   │   │   ├── code

    │   │   │   │   ├── electron-sandbox

    │   │   │   │   │   ├── processExplorer

    │   │   │   │   │   └── workbench

    │   │   │   │   ├── electron-utility

    │   │   │   │   │   └── sharedProcess

    │   │   │   │   └── node

    │   │   │   ├── editor

    │   │   │   │   └── common

    │   │   │   │       ├── languages

    │   │   │   │       │   ├── highlights

    │   │   │   │       │   └── injections

    │   │   │   │       └── services

    │   │   │   ├── platform

    │   │   │   │   ├── accessibilitySignal

    │   │   │   │   │   └── browser

    │   │   │   │   │       └── media

    │   │   │   │   ├── files

    │   │   │   │   │   └── node

    │   │   │   │   │       └── watcher

    │   │   │   │   ├── profiling

    │   │   │   │   │   └── electron-sandbox

    │   │   │   │   └── terminal

    │   │   │   │       └── node

    │   │   │   └── workbench

    │   │   │       ├── api

    │   │   │       │   ├── node

    │   │   │       │   └── worker

    │   │   │       ├── browser

    │   │   │       │   └── parts

    │   │   │       │       └── editor

    │   │   │       │           └── media

    │   │   │       ├── contrib

    │   │   │       │   ├── debug

    │   │   │       │   │   ├── browser

    │   │   │       │   │   │   └── media

    │   │   │       │   │   └── node

    │   │   │       │   ├── extensions

    │   │   │       │   │   └── browser

    │   │   │       │   │       └── media

    │   │   │       │   ├── externalTerminal

    │   │   │       │   │   └── node

    │   │   │       │   ├── notebook

    │   │   │       │   │   └── common

    │   │   │       │   │       └── services

    │   │   │       │   ├── output

    │   │   │       │   │   └── common

    │   │   │       │   ├── terminal

    │   │   │       │   │   └── common

    │   │   │       │   │       └── scripts

    │   │   │       │   ├── webview

    │   │   │       │   │   └── browser

    │   │   │       │   │       └── pre

    │   │   │       │   ├── welcomeGettingStarted

    │   │   │       │   │   └── common

    │   │   │       │   │       └── media

    │   │   │       │   │           └── notebookThemes

    │   │   │       │   ├── windsurfCustomAppIcon

    │   │   │       │   │   └── browser

    │   │   │       │   │       └── media

    │   │   │       │   │           ├── blueprint

    │   │   │       │   │           ├── classic

    │   │   │       │   │           ├── eu

    │   │   │       │   │           ├── hand-drawn

    │   │   │       │   │           ├── original-fed

    │   │   │       │   │           ├── original-insiders

    │   │   │       │   │           ├── original-next

    │   │   │       │   │           ├── pixel-surf

    │   │   │       │   │           ├── retro

    │   │   │       │   │           └── valentine

    │   │   │       │   └── windsurfSounds

    │   │   │       │       └── media

    │   │   │       └── services

    │   │   │           ├── extensionManagement

    │   │   │           │   └── common

    │   │   │           │       └── media

    │   │   │           ├── extensions

    │   │   │           │   └── worker

    │   │   │           ├── languageDetection

    │   │   │           │   └── browser

    │   │   │           ├── search

    │   │   │           │   └── worker

    │   │   │           └── textMate

    │   │   │               └── browser

    │   │   │                   └── backgroundTokenization

    │   │   │                       └── worker

    │   │   └── vscode-dts

    │   └── resources

    │       └── linux

    └── completions

        ├── bash

        └── zsh


1002 directories

안녕하세요. 제공해주신 Windsurf 디렉터리 구조를 보니, 이는 소스 코드가 아니라 미리 컴파일된(pre-compiled) 프로그램입니다.

configure 스크립트나 Makefile 같은 소스 코드 파일이 없고, 실행 파일이 들어있을 bin 폴더와 프로그램 실행에 필요한 각종 리소스(resources), 그리고 node_modules 폴더가 있는 것으로 보아 Electron 기반의 애플리케이션(Visual Studio Code와 유사한 구조)으로 보입니다.

따라서 이 프로그램은 컴파일 과정(make, make install) 없이, 파일을 적절한 위치에 복사하고 바로가기를 만들어주는 방식으로 설치해야 합니다. 아래의 단계를 따라 진행하시면 됩니다.
Windsurf 애플리케이션 설치 방법 (미리 컴파일된 바이너리 기준)

이 방법은 시스템의 패키지 관리자(pacman)를 통하지 않으므로, 업데이트는 수동으로 해야 하며 제거도 직접 파일을 삭제해야 합니다.
1단계: 실행 파일 확인

먼저 bin 디렉터리 안에 어떤 실행 파일이 있는지 확인합니다.
Bash

ls -l ./Windsurf/bin

아마 windsurf 또는 이와 비슷한 이름의 실행 권한이 있는 파일이 있을 것입니다. 이 파일이 메인 실행 파일입니다. 이 가이드에서는 실행 파일명을 windsurf라고 가정하겠습니다.
2단계: 애플리케이션 파일을 /opt로 이동

수동으로 설치하는 독립적인 프로그램은 /opt 디렉터리에 두는 것이 리눅스 파일 시스템 표준(FHS)에 따른 좋은 관례입니다. 이렇게 하면 시스템의 다른 파일들과 섞이지 않아 관리가 편합니다.

Windsurf 디렉터리 전체를 /opt/windsurf로 이동시킵니다.
Bash

# 'sudo'를 사용하여 관리자 권한으로 이동합니다.
sudo mv ./Windsurf /opt/windsurf

3단계: 실행 파일을 PATH에 연결 (심볼릭 링크 생성)

이제 터미널 어디에서든 windsurf 명령어로 프로그램을 실행할 수 있도록, 실제 실행 파일을 /usr/local/bin에 심볼릭 링크(바로가기)로 연결합니다.
Bash

# /opt/windsurf/bin/windsurf 파일을 /usr/local/bin/windsurf 로 링크합니다.
sudo ln -s /opt/windsurf/bin/windsurf /usr/local/bin/windsurf

이제 터미널을 열고 아래 명령어를 입력하면 Windsurf가 실행됩니다.
Bash

windsurf

4단계: 데스크톱 메뉴에 아이콘 추가 (.desktop 파일 생성)

GUI 애플리케이션이므로, GNOME, KDE, XFCE 등의 데스크톱 환경의 '프로그램 메뉴'에 표시되도록 .desktop 파일을 생성해야 합니다.

    /usr/share/applications/ 디렉터리에 windsurf.desktop 파일을 생성합니다.
    Bash

sudo nano /usr/share/applications/windsurf.desktop

아래 내용을 파일에 붙여넣고 저장합니다.
Ini, TOML

    [Desktop Entry]
    Name=Windsurf
    Comment=Code Editor
    Exec=/opt/windsurf/bin/windsurf %U
    Icon=/opt/windsurf/resources/app/icon.png
    Terminal=false
    Type=Application
    Categories=Development;TextEditor;IDE;

    중요:
        Exec: 3단계에서 확인한 실행 파일의 전체 경로입니다.
        Icon: 아이콘 파일의 경로입니다. 아이콘은 보통 resources 폴더 안에 있습니다. find /opt/windsurf -name "*.png" 명령어로 적절한 아이콘 파일(icon.png, app.png 등)을 찾아 경로를 정확하게 수정해주세요. 위 경로는 예상 경로이므로 실제 파일 위치를 확인해야 합니다.
        Categories: 프로그램이 메뉴의 어느 항목에 표시될지를 결정합니다. (개발, 텍스트 편집기 등)

이제 프로그램 메뉴(Activities, 시작 메뉴 등)를 열어보면 'Windsurf' 아이콘이 보이고 클릭하여 실행할 수 있습니다.
제거 방법

pacman으로 설치하지 않았으므로, 제거는 설치 과정의 역순으로 직접 파일을 삭제하면 됩니다.

    .desktop 파일 삭제:
    Bash

sudo rm /usr/share/applications/windsurf.desktop

심볼릭 링크 삭제:
Bash

sudo rm /usr/local/bin/windsurf

프로그램 디렉터리 삭제:
Bash

    sudo rm -rf /opt/windsurf

위 명령어를 모두 실행하면 Windsurf 애플리케이션이 시스템에서 깨끗하게 제거됩니다.

nopc% windsurf -v

1.99.3

c1afeb8ae2b17dbdda415f9aa5dec23422c1fe47

x64

nopc% 


---


직접 bin 설치했는데 버전 최신 버전이 아닌데?

네, 맞습니다. 아주 중요한 점을 발견하셨습니다.

사용자께서 직접 .tar.xz 같은 압축 파일을 다운로드하여 설치하신 방법은 설치한 시점의 버전에 고정됩니다. pacman과 같은 패키지 매니저를 통하지 않았기 때문에, 새로운 버전이 나와도 시스템이 이를 인지하거나 자동으로 업데이트해주지 않습니다.

이것이 바로 수동 설치의 가장 큰 단점 중 하나입니다.
해결책: 최신 버전으로 관리하는 방법

두 가지 방법이 있습니다. 하나는 계속 수동으로 작업하는 것이고, 다른 하나는 Arch Linux의 강력한 기능인 AUR(Arch User Repository)을 사용하는 것입니다.
방법 1: 계속 수동으로 업데이트하기 (비추천)

이 방법은 매번 새로운 버전이 나올 때마다 아래 과정을 반복해야 해서 매우 번거롭습니다.

    기존 버전 삭제: 이전에 설치했던 windsurf를 깨끗하게 삭제합니다.
    Bash

    # 심볼릭 링크 삭제
    sudo rm /usr/local/bin/windsurf

    # 프로그램 디렉터리 삭제
    sudo rm -rf /opt/windsurf

    # 데스크톱 아이콘 삭제
    sudo rm /usr/share/applications/windsurf.desktop

    최신 버전 다운로드: Windsurf 공식 홈페이지나 GitHub 릴리즈 페이지에 방문하여 가장 최신 버전의 .tar.xz 또는 .tar.gz 파일을 다시 다운로드합니다.

    최신 버전으로 재설치: 이전에 했던 것과 동일한 방법으로 /opt에 압축을 풀고 심볼릭 링크와 .desktop 파일을 다시 만듭니다.

방법 2: Arch User Repository (AUR) 사용하기 (강력 추천)

Arch Linux 사용자들이 가장 선호하고, Arch Linux를 강력하게 만들어주는 핵심 기능입니다. 커뮤니티 사용자들이 직접 만든 설치 스크립트(PKGBUILD)를 통해 공식 저장소에 없는 대부분의 프로그램을 pacman처럼 쉽게 설치하고 관리할 수 있습니다.

AUR을 사용하면 windsurf 역시 간단한 명령어로 설치, 업데이트, 삭제가 가능해집니다.

1단계: AUR 헬퍼 설치 (이미 설치했다면 건너뛰기)

yay나 paru 같은 AUR 헬퍼를 사용하면 AUR 패키지를 매우 쉽게 설치할 수 있습니다. 여기서는 yay를 예로 들겠습니다.
Bash

# yay 설치에 필요한 도구들을 설치합니다.
sudo pacman -S --needed git base-devel

# yay 소스 코드를 복제합니다.
git clone https://aur.archlinux.org/yay.git

# 다운로드한 디렉터리로 이동합니다.
cd yay

# 소스를 빌드하고 시스템에 설치합니다.
makepkg -si

2단계: AUR에서 windsurf 검색 및 설치

이제 yay를 사용하여 windsurf를 찾아 설치할 수 있습니다. 보통 이런 프로그램은 미리 컴파일된 바이너리를 제공하는 -bin 접미사가 붙은 패키지가 있습니다. 이것이 직접 다운로드한 것과 가장 유사하며 컴파일 시간이 없어 빠릅니다.
Bash

# AUR에서 windsurf 관련 패키지를 검색합니다.
yay -Ss windsurf

검색 결과에 windsurf-bin과 같은 패키지가 보일 것입니다. 그 패키지를 설치합니다.
Bash

# windsurf-bin 패키지를 설치합니다. (패키지명은 검색 결과에 따라 다를 수 있습니다)
yay -S windsurf-bin

이제 설치 과정에서 묻는 몇 가지 질문에 답하기만 하면 자동으로 최신 버전을 다운로드하여 pacman이 관리할 수 있는 형태로 패키징한 후 설치해 줍니다. .desktop 파일과 PATH 설정도 모두 자동으로 처리됩니다.

3단계: 업데이트

가장 큰 장점입니다. 앞으로 시스템 전체 업데이트를 할 때 windsurf도 함께 최신 버전으로 업데이트됩니다.
Bash

# 공식 저장소 패키지와 AUR 패키지를 모두 업데이트합니다.
yay -Syu

결론

지금이라도 방법 1을 통해 기존 버전을 삭제하신 후, **방법 2(AUR)**를 사용하여 windsurf-bin을 설치하시는 것을 강력하게 추천합니다.

그렇게 하면 앞으로 버전 관리에 신경 쓸 필요 없이, 항상 간단한 명령어로 최신 버전을 유지할 수 있습니다. 이것이 Arch Linux를 사용하는 올바르고 편리한 방식입니다.
