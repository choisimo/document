# FFmpeg 동영상 분할

이 문서는 Linux에서 FFmpeg로 동영상 파일을 자르거나 일정 간격으로 분할할 때 필요한 기준을 정리한다. 목표는 명령어를 복사하는 것이 아니라 `-c copy`와 재인코딩의 차이를 이해하고 원하는 정확도와 속도를 선택하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

동영상 분할은 “몇 초부터 몇 초까지 자른다”처럼 보이지만 실제로는 container, codec, keyframe, timestamp가 함께 영향을 준다. 빠르게 자르려고 `-c copy`를 쓰면 화질 손실은 없지만 keyframe 기준으로 잘릴 수 있다.

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

`-c copy`는 video, audio, subtitle stream을 재인코딩하지 않고 복사한다.

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
- subtitle, multiple audio stream을 유지하려면 `-map 0`을 명시한다.
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

정확한 시간 기준으로 자르고 H.264/AAC로 재인코딩한다.

```bash
ffmpeg -i input.mp4 -ss 00:00:10.500 -t 00:00:30 \
  -map 0:v:0 -map 0:a? \
  -c:v libx264 -crf 18 -preset medium \
  -c:a aac -b:a 192k \
  cut-encoded.mp4
```

긴 파일을 2분 단위로 나눈다.

```bash
mkdir -p segments
ffmpeg -i input.mp4 -map 0 -c copy -f segment -segment_time 120 -reset_timestamps 1 segments/part_%03d.mp4
```

Segment 길이가 keyframe 때문에 정확하지 않으면 재인코딩하면서 keyframe 간격을 맞춘다.

```bash
ffmpeg -i input.mp4 -map 0 \
  -c:v libx264 -crf 20 -preset medium -force_key_frames 'expr:gte(t,n_forced*120)' \
  -c:a aac -b:a 192k \
  -f segment -segment_time 120 -reset_timestamps 1 segments/part_%03d.mp4
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
seconds = target_size_megabytes * 8 * 1024 * 1024 / bitrate_bits_per_second
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

FFmpeg 분할의 핵심 선택은 빠른 stream copy와 정확한 재인코딩 사이의 trade-off다. `-c copy`는 빠르고 무손실에 가깝지만 keyframe 제약을 받으며, 정확한 cut은 인코딩 비용을 치른다.
