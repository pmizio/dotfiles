#!/bin/bash

sh <(curl -L https://nixos.org/nix/install) --no-daemon
mkdir -p $HOME/.config/nix
echo "experimental-features = nix-command flakes" > $HOME/.config/nix/nix.conf
source $HOME/.profile
nix run home-manager/master -- switch -b backup --flake .#wsl
