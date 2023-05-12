#!/bin/bash

function print-unicode-ranges() {
  local arr=("$@")
  local len=$#
  local combinedRanges=()

  echo -n "symbol_map "
  for ((j=0; j<len; j+=2)); do
    echo -n "U+${arr[$j]}-U+${arr[(($j+1))]}"
    if ((j < len-2 )); then
      echo -n ","
    fi
  done

  echo -n " Symbols Nerd Font"
}

function test-fonts() {
  echo "# Nerd Fonts - Pomicons"
  print-unicode-ranges e000 e00d
  echo; echo

  echo "# Nerd Fonts - Powerline"
  print-unicode-ranges e0a0 e0a2 e0b0 e0b3
  echo; echo

  echo "# Nerd Fonts - Powerline Extra"
  print-unicode-ranges e0a3 e0a3 e0b4 e0c8 e0cc e0d2 e0d4 e0d4
  echo; echo

  echo "# Nerd Fonts - Symbols original"
  print-unicode-ranges e5fa e62b
  echo; echo

  echo "# Nerd Fonts - Devicons"
  print-unicode-ranges e700 e7c5
  echo; echo

  echo "# Nerd Fonts - Font awesome"
  print-unicode-ranges f000 f2e0
  echo; echo

  echo "# Nerd Fonts - Font awesome extension"
  print-unicode-ranges e200 e2a9
  echo; echo

  echo "# Nerd Fonts - Octicons"
  print-unicode-ranges f400 f4a8 2665 2665 26A1 26A1 f27c f27c
  echo; echo

  echo "# Nerd Fonts - Font Logos"
  print-unicode-ranges f300 f313
  echo; echo

  echo "# Nerd Fonts - Font Power Symbols"
  print-unicode-ranges 23fb 23fe 2b58 2b58
  echo; echo

  echo "# Nerd Fonts - Material Design Icons"
  print-unicode-ranges f500 fd46
  echo; echo

  echo "# Nerd Fonts - Weather Icons"
  print-unicode-ranges e300 e3eb
  echo; echo

  echo "# Nerd Fonts - All"
  print-unicode-ranges e000 e00d e0a0 e0a2 e0b0 e0b3 e0a3 e0a3 e0b4 e0c8 e0cc e0d2 e0d4 e0d4 e5fa e62b e700 e7c5 f000 f2e0 e200 e2a9 f400 f4a8 2665 2665 26A1 26A1 f27c f27c f300 f313 23fb 23fe 2b58 2b58 f500 fd46 e300 e3eb
  echo; echo
}

test-fonts
