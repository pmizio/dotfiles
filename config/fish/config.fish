set -g fish_greeting

fish_add_path "$HOME/.cargo/bin/"

set -l os (uname)

if test "$os" = Darwin
  eval "$(/usr/local/bin/brew shellenv)"
  set -gx SHELL /usr/local/bin/fish
end

fnm env | source
starship init fish | source
zoxide init fish | source
