set -g fish_greeting

if status is-interactive
  set fish_cursor_default block
  set fish_cursor_insert line
  set fish_cursor_replace_one underscore
  set fish_cursor_replace underscore
  set fish_cursor_visual block
end

fish_add_path "$HOME/.local/bin/"
fish_add_path "$HOME/.cargo/bin/"

fnm env | source
starship init fish | source
zoxide init fish | source

if test -e "$HOME/.tokens.fish"
  source $HOME/.tokens.fish
end

fish_add_path "/Users/$USER/.mbox/mbox-cli"

set -gx EDITOR nvim

bind Ę edit_command_buffer
