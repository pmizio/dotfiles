hs = hs

local MEH = { "shift", "ctrl", "alt" }

local function moveCursorToFocusedWindow()
  local win = hs.window.focusedWindow()
  local frame = win:frame()
  hs.mouse.absolutePosition { x = frame.x + frame.w / 2, y = frame.y + frame.h / 2 }
end

local function launchOrFocusWithMouse(app_name)
  if hs.application.launchOrFocus(app_name) then
    moveCursorToFocusedWindow()
  end
end

hs.hotkey.bind(MEH, "t", function()
  launchOrFocusWithMouse "ghostty"
end)

hs.hotkey.bind(MEH, "b", function()
  launchOrFocusWithMouse "google chrome"
end)
