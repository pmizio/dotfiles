hs = hs
local utils = require "utils"

local MEH = { "shift", "ctrl", "alt" }
local HYPER = { "cmd", table.unpack(MEH) }

local APPS_SHORTCUTS = {
  t = "ghostty",
  b = "google chrome",
  s = "slack",
  f = "finder",
  c = "calendar",
  m = "mail",
  z = "zoom.us",
}

for key, app in pairs(APPS_SHORTCUTS) do
  hs.hotkey.bind(MEH, key, function()
    utils.launchOrFocusWithMouse(app)
  end)
end

local screens = hs.screen.allScreens()
table.sort(screens, function(a, b)
  return a:frame().x < b:frame().x
end)

local keymap = { "q", "w", "e", "r", "t" }

for indexKey, screen in ipairs(screens) do
  hs.hotkey.bind(HYPER, keymap[indexKey], function()
    local win = hs.window.focusedWindow()
    if not win then
      return
    end
    local screenFrame = win:screen():frame()

    utils.disableResizeAnimation(function()
      win:moveToScreen(screen, not screenFrame:equals(win:frame()), true, 0)
    end)
    utils.moveCursorToFocusedWindow()
  end)
end

hs.hotkey.bind(HYPER, "k", function()
  local win = hs.window.focusedWindow()
  if not win then
    return
  end

  local screenFrame = win:screen():frame()
  local winFrame = win:frame()

  utils.disableResizeAnimation(function()
    if screenFrame:equals(winFrame) then
      utils.minimizeCurrentWindow()
    else
      win:maximize()
    end
  end)
  utils.moveCursorToFocusedWindow()
end)

hs.hotkey.bind(HYPER, "x", function()
  hs.reload()
end)
