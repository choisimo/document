# Linux 파일시스템과 파일 I/O

이 문서는 Linux 파일시스템을 inode, directory entry, file descriptor, open file table, permission, link 관점에서 정리한다. 목표는 `ls`, `stat`, `open`, `dup`, `chmod`, `link`, `symlink`가 같은 파일 모델 위에서 어떻게 연결되는지 이해하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

파일 문제는 겉으로 보기에는 “파일이 없다”, “권한이 없다”, “용량이 없다”처럼 단순해 보인다. 하지만 실제 원인은 path 해석, mount point, inode, permission, open file handle, link count, process working directory 중 하나일 수 있다.

파일시스템 모델을 모르면 `chmod`, `chown`, `rm`, `ln`, `mount` 같은 명령을 증상에 맞춰 반복하게 된다. 구조를 알면 어떤 상태를 조회해야 하는지 빨라진다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 boot block, superblock, inode, block pointer, file descriptor array, open file table, active inode table, `stat`, permission, directory, hard link, symbolic link를 강의 노트 형태로 나열한다.

보완해야 할 점은 다음과 같다.

- 오래된 파일시스템 설명과 현대 Linux 운영 관점이 섞여 있다.
- 예제 C 코드에 오타와 중복이 있어 그대로 실행하기 어렵다.
- kernel 자료구조와 사용자 명령의 연결이 약하다.
- hard link와 symbolic link의 장애 사례가 충분히 분리되어 있지 않다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 질문에 답할 수 있는 상태다.

- path가 inode로 해석되는 흐름을 설명한다.
- `open()` 결과인 file descriptor가 무엇을 가리키는지 설명한다.
- `dup()`와 같은 파일을 두 번 `open()`하는 차이를 설명한다.
- `stat()`과 `lstat()`의 차이를 안다.
- file permission과 directory permission의 차이를 안다.
- hard link와 symbolic link의 link count, inode 차이를 확인한다.
- 삭제된 파일이 process에 열려 있어도 공간이 남아 있을 수 있음을 이해한다.

## 4. 시스템 번역 (Data Flow)

파일 열기 흐름은 다음과 같다.

```text
process calls open(path)
  -> VFS resolves path components
  -> directory entries map names to inode numbers
  -> inode metadata is loaded
  -> open file table entry is created
  -> process file descriptor table points to entry
  -> read/write uses file offset and inode data blocks
```

사용자는 path를 다루지만 kernel은 directory entry, inode, open file description, file descriptor를 분리해서 관리한다.

## 5. 핵심 구성요소 (Building Blocks)

Superblock은 filesystem 전체 metadata를 담는다. block size, inode 수, free block 정보 같은 값이 여기에 포함된다.

Inode는 파일의 metadata다. 파일 타입, 권한, 소유자, 크기, timestamp, data block pointer를 가진다. 파일 이름은 inode 안에 저장되지 않는다.

Directory entry는 이름과 inode 번호의 매핑이다. directory 자체도 하나의 파일이며 그 내용이 entry 목록이다.

File descriptor는 process 내부의 작은 정수 handle이다. `0`, `1`, `2`는 표준 입력, 표준 출력, 표준 오류다.

Open file description은 kernel의 열린 파일 상태다. file offset과 open flag를 가진다. `dup()`된 descriptor는 같은 open file description을 공유한다.

Permission은 user, group, other에 대해 read, write, execute bit를 가진다. directory의 execute bit는 path traversal 권한이다.

Hard link는 같은 inode를 가리키는 directory entry를 하나 더 만든다. Symbolic link는 다른 path 문자열을 담은 별도 inode다.

## 6. 상태 전이 (State Transition)

파일 생성과 접근은 다음 상태로 진행한다.

```text
directory has write and execute permission
  -> new directory entry created
  -> inode allocated
  -> data blocks allocated on write
  -> metadata updated
```

파일 열기와 복제는 다음처럼 갈라진다.

```text
open same path twice
  -> two file descriptors
  -> two open file descriptions
  -> independent offsets
```

```text
dup existing descriptor
  -> two file descriptors
  -> one shared open file description
  -> shared offset
```

삭제는 link count와 open handle 상태에 따라 완료 시점이 달라진다.

```text
unlink path
  -> directory entry removed
  -> link count decreases
  -> data freed only when link count is zero and no process keeps it open
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 파일 이름과 inode는 같은 것이 아니다.
- `stat()`은 symlink target을 따라가고, `lstat()`은 symlink 자체를 본다.
- directory에서 파일을 삭제하려면 파일 권한보다 directory write와 execute 권한이 중요하다.
- `chmod 777`은 원인 분석 없이 사용하지 않는다.
- `chown -R`과 `chmod -R`은 대상 tree를 먼저 출력해 확인한다.
- hard link는 일반적으로 directory에 만들지 않는다.
- symlink는 target path가 사라지면 dangling link가 된다.
- 삭제했는데 공간이 안 돌아오면 열린 deleted file handle을 의심한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

파일 metadata를 확인한다.

```bash
touch sample.txt
stat sample.txt
ls -li sample.txt
namei -l sample.txt
```

Hard link와 symbolic link 차이를 본다.

```bash
echo hello > original.txt
ln original.txt hard.txt
ln -s original.txt sym.txt
ls -li original.txt hard.txt sym.txt
stat original.txt hard.txt
lstat sym.txt
```

`lstat` 명령이 없는 환경에서는 `stat` 옵션으로 symlink 자체를 확인한다.

```bash
stat -c '%N %F %i' sym.txt
```

File descriptor를 확인한다.

```bash
exec 3< original.txt
ls -l /proc/$$/fd
cat <&3
exec 3<&-
```

삭제된 파일을 process가 잡고 있는지 확인한다.

```bash
sudo lsof | rg deleted
```

`stat()`과 `lstat()`의 차이를 보는 최소 C 예제다.

```c
#include <stdio.h>
#include <sys/stat.h>
#include <unistd.h>

static void print_inode(const char *label, const struct stat *st) {
    printf("%s inode=%lu mode=%o size=%ld\n",
           label,
           (unsigned long)st->st_ino,
           st->st_mode,
           (long)st->st_size);
}

int main(int argc, char **argv) {
    struct stat st;

    if (argc != 2) {
        fprintf(stderr, "usage: file-stat PATH\n");
        return 2;
    }

    if (stat(argv[1], &st) == 0) {
        print_inode("stat", &st);
    } else {
        perror("stat");
    }

    if (lstat(argv[1], &st) == 0) {
        print_inode("lstat", &st);
    } else {
        perror("lstat");
    }

    return 0;
}
```

Permission을 확인하고 좁게 변경한다.

```bash
ls -ld .
ls -l sample.txt
chmod 600 sample.txt
stat -c '%A %a %U %G %n' sample.txt
```

## 9. 실패 사례 (What could go wrong?)

파일을 삭제했는데 `df` 사용량이 줄지 않으면 process가 삭제된 file handle을 열고 있을 수 있다. `lsof | rg deleted`로 확인하고 process를 재시작해야 공간이 돌아올 수 있다.

`chmod`로 파일에 write 권한을 줬는데 삭제가 안 되면 parent directory 권한을 확인한다. 삭제는 directory entry 변경이기 때문이다.

Symlink target을 상대 경로로 만들면 link를 이동했을 때 깨질 수 있다. `readlink`와 `readlink -f`로 실제 해석 결과를 확인한다.

Hard link는 같은 filesystem 안에서만 동작한다. 다른 mount point로는 `Invalid cross-device link`가 발생한다.

`cp`는 기본적으로 새 inode를 만들지만 `mv`는 같은 filesystem 안에서는 directory entry만 바꿀 수 있다. 이 차이가 권한과 timestamp 결과에 영향을 준다.

`du`와 `df` 값이 다르면 sparse file, deleted open file, mount point, reserved block을 함께 의심한다.

## 10. 뇌 확장하기 (Evolution & Variants)

Linux의 VFS는 ext4, XFS, Btrfs, tmpfs 같은 구체 filesystem 위에 공통 인터페이스를 제공한다. 사용자 프로그램은 대부분 `open`, `read`, `write`, `stat` 같은 system call을 통해 이 공통 모델을 사용한다.

Modern filesystem은 block pointer를 단순 직접, 간접 pointer만으로 설명하기 어렵다. Extents, journal, copy-on-write, checksum, subvolume 같은 구현 차이가 있다. 그래도 inode, directory entry, permission, descriptor 모델은 여전히 핵심이다.

컨테이너 환경에서는 mount namespace 때문에 같은 path라도 process마다 다른 filesystem view를 볼 수 있다. `/proc/<pid>/mountinfo`와 `/proc/<pid>/fd`가 중요한 단서가 된다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] inode와 file name의 차이를 설명할 수 있다.
- [ ] `stat`과 `lstat`의 차이를 확인했다.
- [ ] file descriptor와 open file description의 관계를 이해했다.
- [ ] `dup()`와 같은 파일을 두 번 `open()`하는 차이를 설명할 수 있다.
- [ ] directory permission이 파일 생성과 삭제에 미치는 영향을 안다.
- [ ] hard link와 symbolic link를 구분한다.
- [ ] 삭제된 open file로 인한 용량 문제를 진단할 수 있다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Linux 파일시스템은 path가 아니라 inode와 descriptor 중심으로 동작한다. 이름은 directory entry이고, metadata는 inode이며, process가 쓰는 handle은 file descriptor다.
