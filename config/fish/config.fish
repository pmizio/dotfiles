set -g fish_greeting

eval "$(/usr/local/bin/brew shellenv)"
fnm env --use-on-cd | source

set SPACESHIP_PROMPT_ADD_NEWLINE false
starship init fish | source
