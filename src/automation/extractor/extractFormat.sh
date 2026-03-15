#!/bin/bash

# 원본 파일과 출력 파일 설정
INPUT_FILE="get_id_and_maps.txt"
OUTPUT_FILE="final_mods_and_maps.txt"

# Mods와 Map 초기화
MODS="Mods="
MAPS="Map="

# Mods와 Map 데이터 추출 및 재구성
while IFS= read -r LINE; do
  # Mods 처리
  if [[ $LINE == Mods=* ]]; then
    ID=${LINE#Mods=}
    MODS+="$ID;"
  fi

  # Map 처리
  if [[ $LINE == Map=* ]]; then
    MAP=${LINE#Map=}
    if [[ $MAP != "No maps found" ]]; then
      MAPS+="$MAP;"
    fi
  fi
done < "$INPUT_FILE"

# Mods와 Maps의 끝 세미콜론 제거
MODS=${MODS%;}  # 마지막 세미콜론 제거
MAPS=${MAPS%;}  # 마지막 세미콜론 제거

# 결과 파일 생성
{
  echo "# Enter the mod loading ID here. It can be found in \\Steam\\steamapps\\workshop\\modID\\mods\\modName\\info.txt"
  echo "$MODS"
  echo ""
  echo "# Enter the foldername of the mod found in \\Steam\\steamapps\\workshop\\modID\\mods\\modName\\media\\maps\\"
  echo "$MAPS"
} > "$OUTPUT_FILE"

echo "Reformatted data saved to $OUTPUT_FILE."
