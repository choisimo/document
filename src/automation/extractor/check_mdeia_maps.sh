#!/bin/bash

# 폴더 이름 입력
folderNames="50%metalweight;67commando;74amgeneralM151A2;90pierceArrow;AutoReload;BB_CommonSense;Brita;Brita_K153;Chinatown expansion;CraftHelperContinued;Dead_Space_Zombie;EerieCountry;ExtraSauceSac;FORTREDSTONE;Fort Waterfront;GlassHats;Grapeseed;Gun Stock Attack Remaster;GunFighter_Radial_Menu;KingsmouthKY;MiniHealthPanel;ModGlassHats;NVAPI;Navigation;NewEkron;NoLighterNeeded;OHKKK111;OutTheWindow;P4HasBeenRead;POM;PZGKO_Arsenal;PZGKO_Brita;PZGKO_Gear;PZGKO_KI5;PZGKO_Main;PZGKO_SCKCO;PZGKO_Snake;PZGKO_VFE;ProximityInventory;REORDER_CONTAINERS;RMH;RavenCreek;ReducedWoodWeight25p41;STAIMING;STNIMBLE;STPASSIVE;STRELOAD;STSPRINT;SYMS;SuperBulldozer;TMC_Trolley;TakeAnyAmount;TheStar;TheWorkshop(new version);TheyKnew;UBPropFix;VISIBLE_BACKPACK_BACKGROUND;VehicleRecycling;ZBAY;esIC;hello;improvedbuildmenu41;improvedbuildmenu41-1;improvedbuildmenu41-2;lakeivytownship;modoptions;rSemiTruck;simpleStatus;tctlBags;truemusic;tsarslib"

# 결과 파일 초기화
OUTPUT_FILE="media_maps_results.txt"
> "$OUTPUT_FILE"

# 폴더 이름을 세미콜론으로 분리하여 배열로 순회
IFS=';' read -ra FOLDERS <<< "$folderNames"

for folder in "${FOLDERS[@]}"; do
  echo "Processing folder: $folder" >> "$OUTPUT_FILE"

  # media/maps 경로 설정
  mediaMapsPath="./$folder/media/maps"

  if [ -d "$mediaMapsPath" ]; then
    echo "Media maps path found: $mediaMapsPath" >> "$OUTPUT_FILE"

    # media/maps 하위 폴더 확인
    mapFolders=$(find "$mediaMapsPath" -mindepth 1 -maxdepth 1 -type d | xargs -n 1 basename)

    if [ -n "$mapFolders" ]; then
      echo "Map folders: $mapFolders" >> "$OUTPUT_FILE"
    else
      echo "No folders found inside media/maps" >> "$OUTPUT_FILE"
    fi
  else
    echo "Media maps not found for folder: $folder" >> "$OUTPUT_FILE"
  fi

  echo "" >> "$OUTPUT_FILE"
done

echo "Results saved to $OUTPUT_FILE."
