{ config, pkgs, ...}:

{
  home.username = "miziak";
  home.homeDirectory = "/home/miziak";
  home.packages = [
    pkgs.meson
    pkgs.ninja
    pkgs.eza
    pkgs.neovim
    pkgs.kitty
    pkgs.git
    pkgs.gh
    pkgs.google-chrome
    pkgs.steam
    pkgs.clapper
  ];
  home.stateVersion = "23.05";
  programs.home-manager.enable = true;
}
