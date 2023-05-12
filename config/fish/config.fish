set -g fish_greeting

eval "$(/usr/local/bin/brew shellenv)"
fnm env --use-on-cd | source
starship init fish | source
zoxide init fish | source
