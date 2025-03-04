hs = hs
spoon = spoon

local MEH = { "shift", "ctrl", "alt" }

local spoonInstallZip = "SpoonInstall.spoon.zip"
local spoonDir = "~/.hammerspoon/Spoons"
local spoonInstallUrl = "https://github.com/Hammerspoon/Spoons/raw/master/Spoons/"
  .. spoonInstallZip
local installerZipPath = hs.fs.temporaryDirectory() .. spoonInstallZip
local spoonInstall = spoonDir .. "SpoonInstall.spoon"

local function bootstrap()
  local exists, _ = hs.fs.touch(spoonInstall)
  if exists then
    print "Spoon installer exits. No bootstrap required."
    return
  end

  print "Initializing spoon installer"
  hs.execute("curl --location -vvv -o " .. installerZipPath .. " " .. spoonInstallUrl)
  hs.fs.mkdir(spoonDir)
  hs.fs.chdir(spoonDir)
  hs.execute("unzip -d " .. spoonDir .. " " .. installerZipPath)
end

bootstrap()

hs.loadSpoon "SpoonInstall"
spoon.SpoonInstall.use_syncinstall = true
spoon.SpoonInstall:andUse "MouseFollowsFocus"
spoon.MouseFollowsFocus:start()

hs.hotkey.bind(MEH, "t", function()
  hs.application.launchOrFocus "ghostty"
end)

hs.hotkey.bind(MEH, "b", function()
  hs.application.launchOrFocus "google chrome"
end)

local app_state = {}

local function maximizeWindow(win)
  local frame = win:frame()
  -- maximize if possible
  local max = win:screen():fullFrame()
  frame.x = max.x
  frame.y = max.y
  frame.w = max.w
  frame.h = max.h
  win:setFrame(frame)
end

appwatcher = hs.application.watcher.new(function(name, event, app)
  if name == "Ghostty" and event == hs.application.watcher.launched then
    maximizeWindow(app:mainWindow())
    app_state[name] = true
  elseif
    name == "Ghostty"
    and event == hs.application.watcher.activated
    and not app_state[name]
  then
    hs.timer.doAfter(0.1, function()
      maximizeWindow(app:mainWindow())
    end)
    app_state[name] = true
  elseif name == "Ghostty" and event == hs.application.watcher.deactivated then
    app_state[name] = #app:allWindows() ~= 0
  end
end)

appwatcher:start()
