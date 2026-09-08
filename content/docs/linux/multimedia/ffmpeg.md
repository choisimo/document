# FFmpeg 동영상 분할

이 문서는 Linux에서 FFmpeg로 동영상 파일을 자르거나 일정 간격으로 분할할 때 필요한 기준을 정리한다. 목표는 명령어를 복사하는 것이 아니라 `-c copy`와 재인코딩의 차이를 이해하고 원하는 정확도와 속도를 선택하는 것이다.

## 적용 범위와 결과 검증

- **범위:** FFmpeg·ffprobe version과 build options, input container, video/audio/subtitle codec, time base, variable frame rate와 keyframe 간격을 기록합니다. 설치 package와 지원 codec은 배포판별로 다릅니다.
- **전제:** stream copy는 packet을 재인코딩하지 않지만 cut 위치, timestamp, metadata와 container 호환성은 달라질 수 있습니다. frame 단위 절단은 decode·encode 설정과 audio 경계를 함께 결정합니다.
- **수치 불확실성:** `-segment_time`, 평균 bitrate와 목표 file 크기는 keyframe, VBR, muxing overhead와 stream 구성 때문에 근사값일 수 있습니다. 예제의 초·MB 값은 공식이 아니라 입력 예시입니다.
- **실패·완료:** 재생 불가, A/V sync, 누락 stream, 부정확한 duration, timestamp 불연속과 예상 밖 재인코딩을 확인합니다. ffprobe의 stream·duration·timestamp와 실제 재생, 표본 frame 및 file size 허용 오차가 기준을 만족할 때 완료입니다.

---

## 1. 왜 필요한가? (Pain Point & Motivation)

동영상 분할은 container, codec, keyframe과 timestamp가 함께 영향을 준다. `-c copy`는 재인코딩에 따른 세대 손실을 만들지 않지만 cut 위치·timestamp·metadata·container와 재생 시작 상태는 달라질 수 있다.

정확한 frame 단위가 필요하면 재인코딩이 필요하다. 이때는 속도와 품질, 파일 크기 trade-off를 받아들여야 한다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 FFmpeg 설치, 특정 구간 자르기, 일정 간격 분할, 파일 크기 기준 근사 분할을 설명한다. 보완해야 할 점은 다음과 같다.

- Markdown 구조가 깨져 있고 명령어와 설명이 섞여 있다.
- stream copy의 keyframe 제약과 정확도 한계가 더 명확해야 한다.
- 원본 파일 보호와 출력 파일 검증 절차가 약하다.
- 파일 크기 기준 분할은 정확한 기능이 아니라 bitrate 기반 근사라는 점을 더 분명히 해야 한다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 작업을 선택적으로 수행하는 것이다.

- 입력 파일의 stream과 duration을 확인한다.
- 무손실에 가까운 빠른 cut을 수행한다.
- 정확한 시간 기준 cut을 위해 재인코딩한다.
- 긴 파일을 일정 시간 segment로 나눈다.
- 출력 파일의 duration, stream, 재생 가능 여부를 확인한다.
- 원본 파일을 덮어쓰지 않는다.

## 4. 시스템 번역 (Data Flow)

FFmpeg 처리 흐름은 다음과 같다.

```text
input container
  -> demux video, audio, subtitle streams
  -> seek to requested time
  -> copy streams or decode and encode
  -> mux streams into output container
  -> verify output metadata and playback
```

`-c copy`는 decode와 encode를 건너뛰고 stream packet을 새 container에 다시 담는다. 빠르지만 cut 지점은 codec과 keyframe 구조의 영향을 받는다.

## 5. 핵심 구성요소 (Building Blocks)

`ffprobe`는 입력 파일의 duration, codec, bitrate, stream 구성을 확인한다.

`-ss`는 시작 시간을 지정한다. 위치와 codec copy 여부에 따라 seeking 정확도와 속도가 달라질 수 있다.

`-t`는 시작 지점부터의 길이를 지정한다.

`-to`는 종료 시각을 지정한다. `-t`와 동시에 쓰지 말고 하나만 선택한다.

`-c copy`는 선택된 출력 stream을 재인코딩하지 않고 복사한다. 모든 입력 stream을 자동 선택하는 옵션은 아니며 -map과 출력 container 호환성을 별도로 확인한다.

재인코딩은 `libx264`, `libx265`, `aac` 같은 encoder를 사용해 새 bitstream을 만든다.

Segment muxer는 하나의 입력을 일정 시간 단위의 여러 출력으로 나눈다.

## 6. 상태 전이 (State Transition)

빠른 cut은 다음 상태로 진행한다.

```text
input inspected
  -> keyframe-tolerant cut selected
  -> stream copy output created
  -> output checked
```

정확한 cut은 다음 상태로 진행한다.

```text
input inspected
  -> exact timestamp selected
  -> decode and encode
  -> quality checked
  -> output checked
```

Batch segment는 다음 상태로 진행한다.

```text
segment duration chosen
  -> output pattern prepared
  -> segment muxer writes files
  -> timestamps and playback verified
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 원본 파일을 출력 경로로 덮어쓰지 않는다.
- 작업 전 `ffprobe`로 duration과 stream 구성을 확인한다.
- `-c copy` 결과는 정확한 frame cut이 아닐 수 있다.
- 정확도가 중요하면 재인코딩을 선택한다.
- `-t`와 `-to`의 의미를 혼동하지 않는다.
- 보존할 subtitle·audio stream을 -map으로 명시하고 출력 container가 지원하는지 확인한다. -map 0은 모든 입력 stream을 선택하므로 지원하지 않는 codec·data·attachment가 있으면 실패할 수 있다.
- 출력 파일을 `ffprobe`와 실제 재생으로 확인한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

FFmpeg를 설치한다.

```bash
sudo pacman -S ffmpeg
sudo apt install ffmpeg
sudo dnf install ffmpeg
```

입력 파일을 확인한다.

```bash
ffprobe -hide_banner input.mp4
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 input.mp4
```

10초 지점부터 30초 분량을 빠르게 자른다.

```bash
ffmpeg -ss 00:00:10 -i input.mp4 -t 00:00:30 -map 0 -c copy cut-copy.mp4
```

지정한 시간 부근의 frame을 선택해 H.264/AAC로 재인코딩한다. 이 예제는 첫 video와 존재하는 audio만 선택하며 subtitle·data는 제외한다. 정확한 경계는 입력 time base·VFR·audio sample 단위로 검증한다.

```bash
ffmpeg -i input.mp4 -ss 00:00:10.500 -t 00:00:30 \
  -map 0:v:0 -map '0:a?' \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k \
  cut-encoded.mp4
```

긴 파일을 2분 단위로 나눈다.

```bash
mkdir -p segments
ffmpeg -i input.mp4 -map 0 -c copy -f segment -segment_time 120 -reset_timestamps 1 segments/part_%03d.mp4
```

일정 간격의 경계를 목표로 할 때는 재인코딩하며 keyframe을 요청할 수 있다. frame time base 반올림과 audio 경계 때문에 실제 segment duration 허용 오차를 확인한다. 아래는 video/audio만 선택하며 앞의 stream-copy 결과와 다른 디렉터리에 저장한다.

```bash
mkdir -p segments-encoded
ffmpeg -i input.mp4 -map 0:v:0 -map '0:a?' \
  -c:v libx264 -crf 20 -preset medium -force_key_frames 'expr:gte(t,n_forced*120)' \
  -c:a aac -b:a 192k \
  -f segment -segment_time 120 -reset_timestamps 1 segments-encoded/part_%03d.mp4
```

출력 파일을 확인한다.

```bash
ffprobe -hide_banner cut-copy.mp4
ffprobe -hide_banner cut-encoded.mp4
find segments -type f -name 'part_*.mp4' -print
```

파일 크기 기준 분할은 직접 기능이 아니라 bitrate 기반 근사다.

```bash
ffprobe -v error -show_entries format=bit_rate -of default=nw=1:nk=1 input.mp4
```

예상 시간은 다음 식으로 계산한다.

```text
seconds ≈ target_size_MiB * 8 * 1024 * 1024 / bitrate_bits_per_second
```

## 9. 실패 사례 (What could go wrong?)

`-c copy`로 자른 파일이 시작 부분에서 깨지거나 검은 화면이 나오면 시작 지점이 keyframe이 아닐 수 있다. 재인코딩하거나 cut 지점을 keyframe 근처로 조정한다.

Audio와 video sync가 어긋나면 timestamp 처리와 container compatibility를 확인한다. `-reset_timestamps 1`은 segment 출력에서 도움이 되지만 모든 codec 조합에 보편 해답은 아니다.

Subtitle이나 두 번째 audio track이 사라지면 `-map 0` 없이 기본 stream selection만 사용했을 가능성이 있다.

출력 확장자와 codec/container 조합이 맞지 않으면 player에서 재생되지 않을 수 있다. MP4에는 일반적으로 H.264/AAC 조합이 무난하다.

재인코딩 품질이 낮으면 `-crf` 값을 낮추거나 preset을 조정한다. CRF가 낮을수록 품질과 파일 크기가 증가한다.

파일 크기 기준 분할은 variable bitrate 파일에서 정확하지 않다. 정확한 크기 제한이 필요한 배포 환경은 별도 packaging 정책을 고려한다.

## 10. 뇌 확장하기 (Evolution & Variants)

정확한 편집이 중요하면 FFmpeg 단독 CLI보다 non-linear editor나 lossless cutting tool을 검토할 수 있다. FFmpeg는 자동화와 반복 작업에 강하다.

HLS나 DASH처럼 streaming delivery를 목표로 한다면 단순 segment muxer보다 전용 muxer와 playlist 생성 옵션을 사용한다.

공식 문서는 option 동작을 계속 갱신한다.

- FFmpeg tool documentation: <https://ffmpeg.org/ffmpeg.html>
- FFmpeg formats and segment muxer: <https://ffmpeg.org/ffmpeg-formats.html>

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 원본 파일 metadata를 `ffprobe`로 확인했다.
- [ ] 빠른 cut과 정확한 cut 중 하나를 의도적으로 선택했다.
- [ ] 원본 파일을 덮어쓰지 않았다.
- [ ] 필요한 stream을 유지하기 위해 `-map`을 검토했다.
- [ ] `-t`와 `-to`를 혼동하지 않았다.
- [ ] Segment 출력 파일의 개수와 재생 가능 여부를 확인했다.
- [ ] 출력 파일을 `ffprobe`와 player로 검증했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

FFmpeg 분할은 stream copy의 재인코딩 비용·세대 손실 없는 처리와 재인코딩의 경계 선택 제어를 비교하는 일이다. 어느 쪽도 container·timestamp·audio·keyframe 조건의 실제 결과 검증을 대신하지 않는다.
