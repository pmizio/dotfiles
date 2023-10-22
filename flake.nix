{
  description = "My NixOS";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, home-manager }:
    let 
      system = "x86_64-linux";
      lib = nixpkgs.lib;
    in {
      nixosConfigurations.test-vm = lib.nixosSystem {
        inherit system;
	modules = [
	  ./hosts/vm.nix
	  home-manager.nixosModules.home-manager {
	    home-manager.useGlobalPkgs = true;
	    home-manager.useUserPackages = true;
	    home-manager.users.miziak = import ./home.nix;
	  }
	];
      };
    };
}
