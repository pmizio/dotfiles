{ config, pkgs, thisFlakePath, ...}:

let
  inherit (config.lib.file) mkOutOfStoreSymlink;
  
  flakeDir = "${config.home.homeDirectory}/.dotfiles";
in
{
  programs.home-manager.enable = true;
  home.stateVersion = "23.05";

  home.packages = with pkgs; [
    fish
    fnm
    git
    gh
    fzf
    ripgrep
    eza
    bat
    jq
    tmux
    htop
    ffmpeg
    imagemagick
    gifsicle
    neovim # todo: install nightly
  ];

  home.file = {
    ".gitconfig".source =
      mkOutOfStoreSymlink "${flakeDir}/.gitconfig";
    ".tmux.conf".source =
      mkOutOfStoreSymlink "${flakeDir}/.tmux.conf";
    ".config/starship.toml".source =
      mkOutOfStoreSymlink "${flakeDir}/config/starship.toml";
    ".config/fish/conf.d/aliases.fish".source =
      mkOutOfStoreSymlink "${flakeDir}/config/fish/conf.d/aliases.fish";
  };

  programs = {
    bash.enable = true;
    bash.profileExtra = "exec fish";
    fish = {
      enable = true;
      interactiveShellInit = "set -g fish_greeting";
      functions = {
        nix_switch = {
	  body = ''
	    pushd ${flakeDir}
	    home-manager switch -b backup --flake .#wsl
	    popd
	  '';
	};
      };
    };

    starship.enable = true;
    starship.enableFishIntegration = true;

    zoxide.enable = true;
    zoxide.enableFishIntegration = true;
  };
}
