set -g fish_greeting

fish_add_path "$HOME/.cargo/bin/"

if test (uname) = Darwin
  /usr/local/bin/brew shellenv | source
  set -gx SHELL /usr/local/bin/fish
end

fnm env | source
starship init fish | source
zoxide init fish | source
