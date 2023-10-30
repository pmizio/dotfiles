{
  description = "Dev setup for WSL-Ubuntu-Nix";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, home-manager }:
    let
      config = {
        allowUnfree = true;
      };
    in {
      homeConfigurations.wsl = home-manager.lib.homeManagerConfiguration {
        pkgs = import nixpkgs {
          inherit config;
          system = "x86_64-linux";
        };
	modules = [
	{
          home.username = "miziak";
          home.homeDirectory = "/home/miziak";
	}
	./home.nix
	];
      };
    };
}
