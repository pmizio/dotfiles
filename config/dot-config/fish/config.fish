set -g fish_greeting
set -g fish_key_bindings fish_vi_key_bindings

if status is-interactive
  set fish_cursor_default block
  set fish_cursor_insert line
  set fish_cursor_replace_one underscore
  set fish_cursor_replace underscore
  set fish_cursor_visual block

  function fish_user_key_bindings
    # Execute this once per mode that emacs bindings should be used in
    fish_default_key_bindings -M insert
    fish_vi_key_bindings --no-erase insert
  end
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
