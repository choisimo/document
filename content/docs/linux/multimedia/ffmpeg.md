# FFmpeg로 비디오 파일 분할하기

FFmpeg는 Linux에서 널리 사용하는 multimedia 처리 도구입니다. FFmpeg를 사용하면 재인코딩을 통해 화질 손실을 감수하고 정밀하게 자르거나, 재인코딩에 따른 세대 손실 없이 keyframe 부근에서 stream copy로 자르는 등 다양한 방법으로 동영상을 분할할 수 있습니다.

## 적용 범위와 결과 검증

- **범위:** FFmpeg·ffprobe version과 build options, input container, video/audio/subtitle codec, time base, variable frame rate와 keyframe 간격을 기록합니다. 설치 package와 지원 codec은 배포판별로 다릅니다.
- **전제:** stream copy는 packet을 재인코딩하지 않지만 cut 위치, timestamp, metadata와 container 호환성은 달라질 수 있습니다. frame 단위 절단은 decode·encode 설정과 audio 경계를 함께 결정합니다.
- **수치 불확실성:** `-segment_time`, 평균 bitrate와 목표 file 크기는 keyframe, VBR, muxing overhead와 stream 구성 때문에 근사값일 수 있습니다. 예제의 초·MB 값은 공식이 아니라 입력 예시입니다.
- **실패·완료:** 재생 불가, A/V sync, 누락 stream, 부정확한 duration, timestamp 불연속과 예상 밖 재인코딩을 확인합니다. ffprobe의 stream·duration·timestamp와 실제 재생, 표본 frame 및 file size 허용 오차가 기준을 만족할 때 완료입니다.

---
1단계: FFmpeg 설치

FFmpeg가 설치되어 있지 않다면, 사용 중인 배포판에 맞는 명령어로 먼저 설치해야 합니다.

    Arch Linux (Manjaro 등):
    Bash

sudo pacman -S ffmpeg

Debian / Ubuntu / Mint 등:
Bash

sudo apt update
sudo apt install ffmpeg

Fedora / CentOS / RHEL 등:
Bash

    sudo dnf install ffmpeg

핵심 개념: 재인코딩 vs 스트림 복사

FFmpeg로 파일을 쪼개는 방법은 크게 두 가지이며, 이 차이를 이해하는 것이 중요합니다.

    재인코딩 (기본 방식):
        동영상을 디코딩(해독)한 후 원하는 부분만 잘라내어 다시 인코딩합니다.
        장점: 프레임 단위로 매우 정확한 위치에서 자를 수 있습니다.
        단점: 인코딩 과정 때문에 시간이 오래 걸리고, 원본과 완전히 동일한 화질을 보장하기 어렵습니다. (물론 옵션으로 품질 조절 가능)

    스트림 복사 (-c copy 옵션):
        동영상을 다시 인코딩하지 않고, 기존 데이터(비디오/오디오 스트림)를 그대로 복사해서 새로운 파일에 담기만 합니다.
        장점: 재인코딩이 없으므로 화질 손실이 전혀 없으며, 작업 속도가 매우 빠릅니다.
        단점: 동영상의 키프레임(Keyframe) 단위로만 자를 수 있습니다. 만약 자르는 시작 지점이 키프레임이 아니면, 해당 지점부터 재생이 깨지거나 음성만 나오는 등의 문제가 발생할 수 있습니다. (키프레임: 압축된 비디오에서 완전한 정보를 가진 기준 프레임)

방법 1: 특정 시간 기준으로 파일 1개 잘라내기

원본 파일(input.mp4)에서 원하는 특정 구간만 잘라내어 새로운 파일(output.mp4)로 저장합니다.
A. 스트림 복사로 빠르게 자르기 (추천)

stream copy를 이용하는 대표 방법입니다. media packet을 재인코딩하지 않지만 cut 위치·timestamp·metadata와 container는 달라질 수 있습니다.
Bash

# 10초 지점부터 30초 분량의 동영상을 잘라냅니다. (총 10초~40초 구간)
ffmpeg -i input.mp4 -ss 00:00:10 -t 00:00:30 -c copy output.mp4

    -i input.mp4: 입력 파일 지정
    -ss 00:00:10: 자르기 시작할 시간 (시:분:초 형식 또는 초 단위 숫자)
    -t 00:00:30: 시작 시간(-ss)으로부터 잘라낼 길이(duration)
    -to 00:00:40: -t 대신 -to를 사용하면 종료 시간을 직접 지정할 수 있습니다. (예: -to 00:00:40는 40초 지점에서 종료)
    -c copy: 비디오와 오디오 코덱을 그대로 복사 (스트림 복사)

B. 재인코딩으로 정확하게 자르기

키프레임 위치와 상관없이, 지정한 시간에서 프레임 단위로 정확하게 잘라야 할 때 사용합니다.
Bash

# 10초 500ms 지점부터 30초 분량을 정확히 잘라냅니다.
ffmpeg -i input.mp4 -ss 00:00:10.500 -t 00:00:30 output.mp4

주의: -c copy 옵션이 없으면 FFmpeg는 기본적으로 재인코딩을 시도합니다. 이 경우 화질이 떨어질 수 있으므로 -crf (비디오 품질)나 -b:v (비디오 비트레이트) 같은 옵션을 추가하여 품질을 조절하는 것이 좋습니다.
방법 2: 긴 동영상을 일정한 시간 간격으로 모두 쪼개기

10분짜리 동영상을 2분짜리 파일 5개로 나누는 등, 일정한 시간 간격으로 모든 구간을 분할할 때 매우 유용합니다.
A. 스트림 복사로 빠르게 쪼개기 (추천)
Bash

# input.mp4 파일을 120초(2분) 간격으로 잘라 output_001.mp4, output_002.mp4... 로 저장
ffmpeg -i input.mp4 -c copy -map 0 -segment_time 120 -f segment -reset_timestamps 1 output_%03d.mp4

    -c copy: 화질 저하 없이 빠르게 스트림을 복사합니다.
    -map 0: 원본 파일의 모든 스트림(비디오, 오디오, 자막 등)을 대상으로 합니다.
    -f segment: 동영상을 여러 조각으로 나누는 '세그먼트' 기능을 사용합니다.
    -segment_time 120: 각 조각의 길이를 초 단위로 지정합니다. (120초 = 2분)
    -reset_timestamps 1: 각 조각 파일이 0초부터 시작하도록 타임스탬프를 초기화합니다. 필요 여부는 target player와 timestamp 요구에 따라 다르므로 적용 전후를 검사합니다.
    output_%03d.mp4: 출력 파일 이름 형식. %03d는 파일명에 001, 002, 003과 같이 3자리 숫자를 순서대로 붙이라는 의미입니다.

참고: 스트림 복사 방식이므로 -segment_time에 지정한 시간과 정확히 일치하지 않을 수 있습니다. FFmpeg는 지정된 시간에서 가장 가까운 키프레임을 기준으로 파일을 나누기 때문입니다.
B. 재인코딩으로 정확하게 쪼개기

시간을 매우 정확하게 맞춰야 한다면 -c copy 옵션을 빼고 실행합니다. (속도는 훨씬 느려집니다.)
Bash

ffmpeg -i input.mp4 -map 0 -segment_time 120 -f segment -reset_timestamps 1 output_%03d.mp4

방법 3: 특정 파일 크기 기준으로 쪼개기

FFmpeg는 파일 크기를 기준으로 직접 자르는 옵션을 제공하지 않습니다. 하지만 아래와 같이 비트레이트(bitrate)를 계산하여 간접적으로 할 수 있습니다.

1단계: 동영상 정보(비트레이트) 확인

ffprobe (FFmpeg에 포함된 도구)를 사용하여 동영상의 평균 비트레이트를 확인합니다.
Bash

ffprobe -v error -show_format -show_streams input.mp4 | grep "bit_rate="

명령어를 실행하면 bit_rate=3000000 과 같은 결과를 얻을 수 있습니다. (bps 단위)

2단계: 원하는 크기에 맞는 시간 계산

    계산식: 쪼갤 시간(초) = (원하는 파일 크기(MB) * 8 * 1024 * 1024) / 비트레이트(bps)

예를 들어, 비트레이트가 3,000,000 bps (3000 kbps)인 동영상을 100MB 크기로 자르고 싶다면:
시간(초) = (100 * 8 * 1024 * 1024) / 3000000 ≈ 279.6 초

3단계: 계산한 시간으로 segment 기능 사용
Bash

# 약 280초 간격으로 동영상을 분할
ffmpeg -i input.mp4 -c copy -map 0 -segment_time 280 -f segment -reset_timestamps 1 output_%03d.mp4

이 방법은 평균 비트레이트를 사용하므로 파일 크기가 정확하게 맞지는 않지만, 근사치로 쪼개는 데 유용합니다.
요약
목적	추천 명령어	특징
특정 구간 1개 자르기	ffmpeg -i input.mp4 -ss [시작] -t [길이] -c copy output.mp4	가장 일반적. 재인코딩에 따른 세대 손실은 없지만 정확도와 속도는 keyframe·storage·container에 종속.
일정한 시간 간격으로 모두 쪼개기	ffmpeg -i input.mp4 -c copy -f segment -segment_time [초] ... output_%03d.mp4	긴 동영상을 여러 개로 나눌 때 편리.
정확한 시간/프레임에 맞춰 자르기	-c copy 옵션 제거	재인코딩으로 느리지만 정확함.

