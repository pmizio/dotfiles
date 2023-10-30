# My work dotfiles

```bash
# MacOS
brew install ansible

# run bootstrap playbook
ansible-playbook bootstrap.yml

# apply nix flake (Linux/WSL)
# install nix
nix run home-manager/master -- init --switch
home-manager switch -b backup --flake .#wsl
```
