#!/bin/bash

sh <(curl -L https://nixos.org/nix/install) --no-daemon
mkdir -p $HOME/.config/nix
echo "experimental-features = nix-command flakes" > $HOME/.config/nix/nix.conf
source $HOME/.profile
#nix-channel --add https://github.com/nix-community/home-manager/archive/master.tar.gz home-manager
#nix-channel --update
#nix-shell '<home-manager>' -A install
nix run home-manager/master -- switch -b backup --flake .#wsl
#home-manager switch -b backup --flake .#wsl
#nix run . --switch --flake .#wsl
