set -g fish_greeting

fish_add_path "$HOME/.cargo/bin/"

eval "$(/usr/local/bin/brew shellenv)"
fnm env | source
starship init fish | source
zoxide init fish | source
