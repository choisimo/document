# 5.1 파일 시스템 구조
- 부트블록 (Boot block)
```text
파일 시스템 시작부에 위치하고 보통 첫 번째 섹터 차지
리눅스 시작 시 사용되는 부트스트랩 코드가 저장되는 블록
```
- 슈퍼 블록 (Super block)
```text
전체 파일 시스템에 대한 정보를 저장
> 총 블록수, 사용 가능 i-node 개수, 사용 가능한 블록 비트맵, 블록 크기 ,사용 중(가능)인 블록수 등
```
- i-리스트 (i-list)
```text
각 파일을 나타내는 모든 i-node 들의 list
한 블록은 약 40개 정도의 i-node 포함
```
- 데이터 블록 (Data block)
```text
파일의 내용(데이터)를 저장하기 위한 블록들
```

## i-node (i-node)
```text
한 파일은 하나의 i-node를 가진다.
```
```text
파일에 대한 모든 정보를 가지고 있음.
> 파일 타입 : 일반 파일, 디렉터리, 블록 장치 (/dev/sda), 문자 장치 (/dev/tty) 등
> 파일 크기
> 사용 권한
> 파일 소유자, 그룹, 그외
> 접근 및 갱신 시간
> 데이터 블록에 대한 포인터(주소) 등
``` 

## 블록 포인터
- 데이터 블록에 대한 포인터
```text
> 파일의 내용을 저장하기 위해 할당된 데이터 블록의 주소
```
- 하나의 i-node 내의 블록 포인터
```text
> 직접 블록 포인터 : 10개
> 간접 블록 포인터 : 1개
> 이중 간접 블록 포인터 : 1개
> 참고 : 최근 파일 시스템에서는 삼중 블록 포인터를 포함하기도 함
```
- 최대 가리킬 수 있는 데이터 블록의 개수
```text
> 직접 블록 포인터 10개 -> 블록 10개
> 간접 블록 포인터 1개 -> 1024 개의 직접 블록 포인터
>> 가정 : 블록 포인터 크기 4 byte, 한 블록의 크기 4096 byte
> 이중 간접 블록 포인터 1개 -> 1024 개의 간접 블록 포인터 -> 1024 * 1024 개의 직접 블록 포인터
> 총 개수 : 1 * 10 + 1 * 1,024 + 1,024 * 1,024 = 1,049,610
```

## 파일 입출력 구현 
- 파일 입출력 구현을 위한 커널 내 자료구조
```text
> 파일 디스크립터 배열 (fd array)
> 열린 파일 테이블 (Open File Table)
> 동적 i-node 테이블 (Active i-node table)
```
<img src="https://github.com/choisimo/document/assets/150008602/b173b661-0b1e-4b28-935e-07550c2b4a5e">

## 파일 디스크립터 배열 (fd array)
```text
> 프로세스 당 하나씩 갖는다
```
- 파일 디스크립터 배열
```text
> 프로세스 내의 자료 구조
> 프로세스 내에서 열린 파일의 파일 디스크립터를 저장하기 위한 구조
> 열린 파일 테이블 엔트리를 가리킨다
```
- 파일 디스크립터
```text
> 파일 티스트립터 배열의 인덱스
> 열린 파일을 나타내는 번호
```

## 열린 파일 테이블 (Open File Table)
- 열린 파일 테이블 (file table)
```
> 커널 내의 자료구조
> 열려진 모든 파일 목록
> 파일 테이블 엔티리로 구성
> 파일을 열 때마다 파일 테이블 엔트리가 만들어짐
```
- 파일 테이블 엔트리 (file table entry)
```text
> 파일 상태 플래그 (read, write, append)
> 파일의 현재 위치 (current file position)
> 동적 i-node에 대한 포인터
```
## 동적 i-node 테이블 (Active i-node table)
- 동적 i-node 테이블 (Active i-node table)
```text
> 커널 내의 자료구조
> 열린 파일들의 i-node를 저장하는 테이블
> 열린 파일의 i-node의 모든 정보를 가지고 옴
```
- i-node
```text
> 하드 디스크에 저장되어 있는 파일에 대한 자료구조
> 한 파일에 하나의 i-node
> 하나의 파일에 대한 정보 저장
>> 소유자, 크기
>> 파일이 위치한 장치
>> 파일 내용 디스크 블록에 대한 포인터
```
## 파일을 위한 커널 자료 구조
- `fd = open("file", O_RDONLY);` 실행 시
```text
1. i-node를 찾아서 동적 i-node 테이블로 가져와 테이블 내에 하나의 엔트리 생성
2. 열린 파일 테이블에도 하나의 엔트리 생성하여 
   파일 위치, 플래그, 동적 i-node 에 대한 포인터 저장
3. 파일 디스크립터 배열에 엔트리를 만들어 인덱스(fd) 반환
```
- 열린 파일에 대해 읽거나 쓸 때, 데이터 블록 위치 찾는 방법<br>
<br>
<img src="https://github.com/choisimo/document/assets/150008602/e2daa91a-309d-4cae-bf8c-e1cfe5dd2fda"><br>
<br>
```text
열린 파일 테이블 엔트리에 저장된 
현재 파일 위치 정보 + 동적 i-node 내의 블록 포인터 정보 이용
```

- 한 파일을 두 번 열 때 자료구조<br>

<br>
<img src="https://github.com/choisimo/document/assets/150008602/2cf6f1c4-dc75-4cd4-aac2-493ed0cda272">
<br>

```text
> 이미 해당 파일의 i-node 내용이 동적 i-node 테이블에 존재
> 열린 파일 테이블 내에 새로운 엔트리를 만들어야함 (현재 파일 위치, 파일 상태 플래그 새로 설정)
> fd 배열에도 새로운 엔트리 만들어 fd 반환
```

- `fd = dup(3);` 혹은 `fd = dup2(3,4);`<br>
<br>
<img src="https://github.com/choisimo/document/assets/150008602/799c0f96-8e78-42e2-8c44-fa80589de1e0">
<br>

```text
fd 배열 내에만 새로운 엔트리를 만듦
열린 파일 테이블 내의 동일한 파일 엔트리 가리키도록 함
```

# 5.2 파일 상태 정보

## 파일 상태 (file status)
- 파일 상태
```text
> 파일에 대한 모든 정보
> 블록수, 파일 타입, 사용 권한, 링크수, 파일 소유자의 사용자 ID, 그룹 ID, 파일 크기, 최종 수정 시간 등
```
```shell
$ ls -l hello.c
2 -rw-r--r-- 1 user group 600 11월 17일 15:33  hello.c
```

## 상태 정보 : stat() 시스템 호출 (System Call)
```text
> 파일 하나당 하나의 i-node 가 있으며, i-node 내에 파일에 대한 모든 상태 정보가 저장되어 있음
> lstat()과 stat()의 차이는 lstat은 대상이 심볼릭 링크일 때 링크가 가리키는 파일이 아니라
  링크 자체에 대한 정보
```
```C
#include <sys/types.h>
#include <sys/stat.h>

int stat(const char *filename. struct stat *buf);
int fstat(int fd, struct stat *buf);
int lstat(const char *filename, struct stat *buf);
/**
    파일의 상태 정보를 가져와서 stat 구조체 buf에 저장.
    성공시 0, 실패시 -1 리턴
*/
```
## stat 구조체 (struct)
```C
struct stat {
    mode_t st_mode;     // 파일 타입과 사용권한
    ino_t st_ino;       // i-node 번호
    dev_t st_dev;       // 장치 번호
    dev_t st_rdev;      // 특수 파일 장치 번호
    nlink_t st_nlink;   // 링크 수
    uid_t st_uid;       // 소유자의 사용자 ID
    gid_t st_gid;       // 소유자의 그룹 ID
    off_t st_size;      // 파일 크기
    time_t st_atime;    // 최종 접근 시간
    time_t st_mtime;    // 최종 수정 시간
    time_t st_ctime;    // 최종 상태 변경 시간
    long st_blksize;    // 최종 블록 크기
    long st_blocks;     // 파일의 블록 수 
};
```
## 파일 타입
|||
|--|--|
|**파일 타입**|**설명**|
|`일반 파일`|데이터를 갖고 있는 텍스트 파일 또는 이진 파일|
|`디렉터리 파일`|파일의 이름들과 파일 정보에 대한 포인터를 포함하는 파일|
|`문자 장치 파일`|문자 단위로 데이터를 전송하는 장치를 나타내는 파일 <br> (입출력 장치, 예 : 터미널, 프린터, 키보드 등)|
|`블록 장치 파일`|블록 단위로 데이터를 전송하는 장치를 나타내는 파일 <br> (HDD, SSD와 같은 저장 장치, 예: /dev/sda)|
|`FIFO 파일`|프로세스 간 통신에 사용되는 파일로 이름 있는 파이프|
|`SOCKET`|네트워크를 통한 프로세스 간 통신에 사용되는 파일|
|`심볼릭 링크`|다른 파일을 가리키는 포인터 역할을 하는 파일|
||

## 파일 타입 검사 함수
- 파일 타입을 검사하기 위한 매크로 함수
```text
S_ISREG() : 대상이 일반 파일이면 1, 아니면 0 반환
```
|||
|--|--|
|**파일 타입**|**파일 타입을 검사하기 위한 매크로 함수**|
|`일반 파일`|S_ISREG()|
|`디렉터리 파일`|S_ISDIR()|
|`문자 장치 파일`|S_ISCHR()|
|`블록 장치 파일`|S_ISBLK()|
|`FIFO 파일`|S_ISFIFO()|
|`SOCKET`|S_ISSOCK()|
|`심볼릭 링크`|S_ISLNK()|
||

```C
#include <sys/types.h>
#include <sys/stat.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

/**
    hard-link : fd
    symbolic-link : route
*/
int main(int argc, char **argv){
    int i;
    struct stat buf;
    for (i=1; i<argc; i++){
        if (lstat(argv[i], &buf) < 0){
            perror("lstat()");
            continue;
       }

        if(S_ISREG(buf.st_mode)) printf("%s \n", "일반 파일");
        if(S_ISDIR(buf.st_mode)) printf("%s \n", "디렉터리");
        if(S_ISCHR(buf.st_mode)) printf("%s \n", "문자 장치 파일");
        if(S_ISBLK(buf.st_mode)) printf("%s \n", "블록 장치 파일");
        if(S_ISFIFO(buf.st_mode)) printf("%s \n", "FIFO 파일");
        if(S_ISLNK(buf.st_mode)) printf("%s \n", "심볼릭 링크");
        if(S_ISSOCK(buf.st_mode)) printf("%s \n", "소켓");
    }
    exit(0);
}
```

## 파일 사용 권한 (File Permissions)
- 각 파일에 대한 권한 관리
```text
> 각 파일마다 사용권한이 있다
> 소유자(owner)|그룹(group)|기타(others)로 구분하여 관리한다
```
- 파일에 대한 권한
```text
> 읽기 r
> 쓰기 w
> 실행 x
```
## 사용 권한
- read 권한이 있어야 `O_RDONLY`, `O_RDWR` 을 사용하여 파일을 열 수 있다.
- write 권한이 있어야 `O_WRONLY`, `O_RDWR`, `O_TRUNC` 을 사용하여 파일을 열 수 있다.
- 디렉토리에 write 권한과 execute 권한이 있어야 파일 `생성`, `삭제` 가능

## chmod(), fchmod()
```C
#include <sys/stat.h>
#include <sys/types.h>

int chmod(const char* path, mode_t mode);
int fchmod(int fd, mode_t mode);
```
- 파일의 사용 권한을 변경
```text
> 리턴 값 : 성공(0), 실패(-1)
> mode : 8진수 형태의 세자리 정수 (ex.644)
```
```C
#include <sys/types.h> 
#include <sys/stat.h> 
#include <stdio.h> 
#include <stdlib.h>

int main(int argc, char **argv){
    int newmode;
    // String to long (8 진수)
    newmode = (int) strtol(argv[1], (char**) NULL, 8);
    if (chmod(argv[2], newmode) == -1){
        perror(argv[2]);
        exit(1);
    }
    exit(0);
}
```
## chown()
```C
#include <sys/types.h>
#include <unistd.h>

int chown(const char* path, uid_t owner, gid_t group);
int fchown(int fd, uid_t owner, gid_t group);
```
```text
> 파일의 user ID 와 group ID 를 변경
> 리턴 : 성공 (0), 실패 (-1)
> 파일의 소유자는 super-user 만 가능
> 파일의 그룹은 파일의 소유자가, 그 소유자가 멤버인 다른 그룹으로 변경 가능
> super-user는 임의로 그룹 변경 가능
```

## utime()
```C
#include <sys/types.h>
#include <utime.h>

int utime(const char *filename, const struct utimbuf *times);
```
```text
> 파일의 최종 접근 시간과 최종 변경 시간을 조정
> times가 NULL 이면, 현재시간으로 설정
> 리턴 값 : 성공 (0), 실패 (-1)
```
```C
struct utimbuf{
    time_t actime; // access time
    time_t modtime; // modification time
}
```
```text
각 필드는 1970-01-01 00:00 부터 현재 시간까지의 경과 시간을 초로 환산한 값
```
```C
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/time.h>
#include <utime.h>
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char *argv[]){
    struct stat buf; //파일 상태 저장 변수
    struct utimbuf time;

    if (argc < 3){
        fprintf(stderr, "사용법: cptime file1 file2\n");
        exit(1);
    }

    if (stat(argv[1], &buf) < 0){
        perror("stat()");
        exit(-1);
    }

    time.actime = buf.st_atime; //접근 시간
    time.modtime = buf.sf_mtime; //수정 시간

    if (utime(argv[2], &time)) //접근, 수정 시간 복사
        perror("utime");
    else exit(0);
}
```
```shell
ls -sl a.txt b.txt
> 현재 파일 정보 확인
cptime a.txt b.txt
> b.txt의 수정 시간을 a.txt의 수정 시간으로 변경 
ls -sl a.txt b.txt
> 다시 파일 정보 확인
```

# 5.3 디렉터리
## 디렉터리
- 디렉터리는 루트 디렉터리부터 시작하여 트리 구조 형성
```text
디렉터리 내의 디렉터리 : 그 디렉터리의 서브 디렉터리
```
- 디렉터리는 폴더(folder)라고도 함

## 디렉터리의 구현
- 디렉터리 엔트리
```text
> 각 엔트리는 디렉터리 내 하나의 파일 나타냄
> 파일 이름과 그 파일의 i-node 번호로 구성
```
```C
#include <dirent.h>

struct dirent {
    ino_t d_ino; //i-node 번호
    char d_name[NAME_MAX + 1] // file 이름
}
```
![스크린샷 2024-04-15 034105](https://github.com/choisimo/document/assets/150008602/4ec330fe-6b1e-4bea-9cb5-1df00830f77e)

## 디렉터리 리스트
- opendir()
```text
> 디렉터리 열기 함수
> DIR 포인터 (열린 디렉터리를 가리키는 포인터) 리턴
```
- readdir()
```text
디렉터리 읽기 함수
```
- DIR 구조체 : 디렉터리에 대한 정보를 저장하기 위한 구조체
```C
#include <sys/types.h>
#include <dirent.h>

DIR *opendir (const char *path);
// path 디렉터리를 열고 성공하면 DIR 구조체 포인터, 실패하면 NULL 리턴
struct dirent *readdir(DIR *dp);
// 한 번에 디렉터리 엔트리를 하나씩 읽어서 리턴
```
```C
#include <sys/types.h> 
#include <sys/stat.h> 
#include <dirent.h> 
#include <stdio.h> 
#include <stdlib.h>

int main(int argc, char* argv[]){
    DIR *dp;
    char *dir;
    struct dirent *d;
    struct stat st;
    char path[BUFSIZ + 1];
    
    if (argc == 1) dir = "."; 
    else dir = argv[1];

    if ((dp == opendir(dir)) == null) perror(dir);

    while ((d = readdir(dp)) != NULL) 
        printf("%s \n", d -> d_name); 

    closedir(dp);
    exit(0);
}
```
## 파일 이름/크기 출력
- 디렉터리 내에 있는 파일 이름과 그 파일의 크기 (블록의 수) 출력하도록 확장
```C
while ((d = raddir(dp)) != null ){
    // 디렉터리 내의 각 파일 파일경로명 만들기
    sprintf(path, "%s/%s", dir, d -> d_name);
    if (lstat(path, &st) < 0); // 파일 상태 정보 가져오기
        perror(path);
    printf("%5d %s", st->st_blocks, d->name); // 블록 수, 파일 이름 출력
}
```
## st_mode
- `lstat()` 시스템 호출
```text
파일 타입과 사용권한 정보는 st->st_mode 필드에 함께 저장됨
```
- `st_mode` 필드 <br>
<br>
![스크린샷 2024-04-15 040416](https://github.com/choisimo/document/assets/150008602/839de2fa-37e2-4dfa-90b3-b01df47d8e4e)
<br>
- 프로그램 구성 
```C
> main()      // 메인 프로그램
> printStat() // 파일 상태 정보 프린트
> type()      // 파일 타입 리턴
> perm()      // 파일 사용권한 리턴
```
```C
#include <sys/types.h> 
#include <sys/stat.h> 
#include <dirent.h> 
#include <pwd.h>
#include <grp.h> 
#include <stdio.h> 
#include <time.h>

char type(mode_t);
char *perm(mode_t);
void printStat(char*, char*, struct stat*);

int main(int argc, char *argv[])
{
    DIR *dp;
    char *dir;
    struct stat st;
    struct dirent *d;
    char path[BUFSIZE + 1];

    if (argc == 1)
        dir = ".";
    else 
        dir = argv[1];

    if ((dp = opendir(dir)) == NULL)
        perror(dir);
    
    while ((d = readdir(dp)) != NULL){
        sprintf(path, "%s/%s", dir, d -> d_name);
        if (lstat(path, &st) < 0)
            perror(path);
        printStat(path, d->d_name, &st);
        putchar('\n');
    }

    closedir(dp);
    exit(0);
}
```

```C
void printStat(char *pathname, char* file, struct stat* st){
        /* 파일 상태 정보를 출력 */
    void printStat(char *pathname, char *file, struct stat *st) {

    printf("%5d ", st->st_blocks);                          // 블록 수
    printf("%c%s ", type(st->st_mode), perm(st->st_mode));  // 파일타입, 권한
    printf("%3d ", st->st_nlink);                           // 링크 수
    printf("%s %s ", getpwuid(st->st_uid)->pw_name,         // 사용자 이름
    getgrgid(st->st_gid)->gr_name);                         // 그룹 이름
    printf("%9d ", st->st_size);                            // 파일 크기 (바이트 단위)
    printf("%.12s ", ctime(&st->st_mtime)+4);               // 변경 시간 출력 (참고: 요일 빼기 위해+4)
    printf("%s", file);                                     // 파일 이름 
    }
}
```
- file type
```C
char type(mode_t mode){
    if (S_ISREG(mode)) 
       return ('-');
    if (S_ISDIR(mode))
       return ('d');
    if (S_ISCHR(mode)) 
       return ('c');
    if (S_ISBLK(mode))
       return ('b');
    if (S_ISLNK(mode)) 
       return('l');
    if (S_ISFIFO(mode)) 
       return('p');
    if (S_ISSOCK(mode)) 
       return('s');
}
```
- perm
```C
#define S_IRUSR 00400
#define S_IWUSR 00200
#define S_IXUSR 00100
```
```C
char *perm(mode_t mode){
    int i;
    static char perms[10] = "-------";

    for (i = 0; i < 3; i++){
        if (mode & (S_IRUSR >> i * 3))
            perms[i*3] = 'r';
        if (mode & (S_IWUSR >> i * 3))
            perms[i*3 + 1] = 'w';
        if (mode & (S_IXUSR >> i + 3))
            perms[i*3 + 2] = 'x';
    }
    return(perms);
}
```
## 디렉터리 만들기
- mkdir() 시스템 호출
```text
> path가 나타내는 새로운 디렉터리를 만든다
> "." 와 ".." 파일은 자동으로 만들어진다
```
- rmdir() 시스템 호출
```text
> path가 나타내는 디렉터리가 비어 있으면 삭제
```
```C
#include <unistd.h>
int rmdir(const char* path);
// 비어있으면 삭제, 성공 (0), 실패 (-1)
```
## 디렉터리 구현
- 디렉터리를 위한 구조는 따로 없다
```text
> 디렉터리도 일종의 파일로 다른 파일처럼 구현됨
> 디렉터리도 다른 파일처럼 하나의 i-node 로 표현됨
> 디렉터리의 내용은 디렉터리 엔트리 (파일이름, i-node 번호) 로 구성
```
![스크린샷 2024-04-15 042625](https://github.com/choisimo/document/assets/150008602/bf0ead50-1bcf-4247-a2f3-eee95a070544)
![스크린샷 2024-04-15 042748](https://github.com/choisimo/document/assets/150008602/c118261d-d7cb-43b8-92a2-a026225cc8fa)

## 링크
- 링크는 기존 파일에 대한 또 다른 이름으로 `하드 링크`, `심볼릭 링크` 가 있다.
- 링크 시스템 호출
```text
기존 파일 existing 에 대한 링크를 만듦 (동일한 i-node를 가리킴)
```
![스크린샷 2024-04-15 042933](https://github.com/choisimo/document/assets/150008602/72232cd1-f79d-4168-a202-8d77fcbf24f7)

```C
#include <unistd.h>

int main(int argc, char* argv[]){
    if (link(argv[1], argv[2]) == -1){
        exit(1); // 하드 링크 생성 실패
    }
    exit(0);
}
```
![스크린샷 2024-04-15 043542](https://github.com/choisimo/document/assets/150008602/e36c9754-93ac-460e-920d-2c2101057f15)
```text
하드 링크 -> 같은 i-node
심볼릭 링크 -> 다른 i-node
```
```C
#include <unistd.h>
main (int argc, char* argv[]){
    int unlink();
    if (unlink(argv[1]) == -1){
        perror(argv[1]);
        exit(1);
    }
    exit(0);
}
// ./unlink b.txt 링크 수가 0이 되면 파일 삭제됨
```
## 심볼릭 링크
```C
int symlink (const char* actualpath, const char* sympath);
// 만드는데 성공하면 0, 실패하면 -1을 리턴

#include <unistd.h>
int main(int argc, char* argv[]){
    if (symlink(argv[1], argv[2]) == -1)
    {
        exit(1);
    }   
    exit(0);
}
```
## 심볼릭 링크 내용
```C
#include <unistd.h>
int readlink(const char* path, char* buf, size_t bufsize);
/**
    path 심볼릭 링크의 실제 내용을 읽어서 buf에 저장
    리턴 : 성공(buf에 저장한 바이트 수), 실패(-1)
*/
```
```C
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main(int argc, char* argv[]){
    char buffer[1024];
    int nread;
    nread = readlink(argv[1], buffer, 1024);
    if (nread > 0){
        write(1, buffer,  nread);
        exit(0);
    } else {
        fprintf(stderr, "오류 : 해당 링크 없음\n");
        exit(1);
    }
}
```