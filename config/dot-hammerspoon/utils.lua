local M = {}

function M.moveCursorToFocusedWindow()
  local win = hs.window.focusedWindow()
  if not win then
    return
  end

  local winScreen = win:screen()
  local frame = winScreen:absoluteToLocal(win:frame())
  hs.mouse.setRelativePosition(
    { x = frame.x + (frame.w / 2), y = frame.y + (frame.h / 2) },
    winScreen
  )
end

function M.disableResizeAnimation(action)
  -- Temporarily disable EnhancedUserInterface to prevent window animations
  -- (see https://github.com/Hammerspoon/hammerspoon/issues/3224#issuecomment-1294359070)
  local axApp = hs.axuielement.applicationElement(hs.window.frontmostWindow():application())
  local wasEnhanced = axApp.AXEnhancedUserInterface
  axApp.AXEnhancedUserInterface = false

  -- Temporarily disable window animations
  local originalAnimationDuration = hs.window.animationDuration
  hs.window.animationDuration = 0

  action()

  -- Restore the original settings
  hs.window.animationDuration = originalAnimationDuration
  axApp.AXEnhancedUserInterface = wasEnhanced
end

function M.minimizeCurrentWindow()
  local win = hs.window.focusedWindow()
  if not win then
    return
  end

  local frame = win:frame()
  local screen = win:screen()
  local max = screen:frame()
  frame.w = max.w * 0.4
  frame.h = max.h * 0.6
  frame.x = max.x + (max.w - frame.w) / 2
  frame.y = max.y + (max.h - frame.h) / 2

  win:setFrame(frame)
end

function M.launchOrFocusWithMouse(app_name)
  if hs.application.launchOrFocus(app_name) then
    M.moveCursorToFocusedWindow()
  end
end

return M
