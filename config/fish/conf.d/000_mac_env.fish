if test (uname) = Darwin
  /usr/local/bin/brew shellenv | source
  fish_add_path "$HOME/Library/Python/3.11/bin"
  fish_add_path "$HOME/Library/Android/sdk/platform-tools"
  set -gx SHELL /usr/local/bin/fish
end
