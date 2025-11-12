Phoenix.notify("Phoenix config loading");

Phoenix.set({
  daemon: false,
  openAtLogin: true
});

let log = function (o, label = "obj: ") {
  Phoenix.log(`${(new Date()).toISOString()}:: ${label} =>`)
  Phoenix.log(JSON.stringify(o))
}

_.mixin({
  flatmap(list, iteratee, context) {
    return _.flatten(_.map(list, iteratee, context))
  }
});

MARGIN_X = 5;
MARGIN_Y = 5;
GRID_WIDTH = 12;
GRID_HEIGHT = 6;

focused = () => Window.focused();

function visible() { 
  return Window.all().filter( w => {
    if (w != undefined) { 
      return w.isVisible();
    } else {
      return false;
    }
  })
}

Window.prototype.screenFrame = function(screen) {
  return (screen != null ? screen.flippedVisibleFrame() : void 0) || this.screen().flippedVisibleFrame();
}

Window.prototype.fullGridFrame = function() {
  return this.calculateGrid({y: 0, x: 0, width: 1, height: 1});
}

function snapAllToGrid() { _.map(visible(), win => win.snapToGrid()) }

changeGridWidth = n => {
  GRID_WIDTH = Math.max(1, GRID_WIDTH + n);
  Phoenix.notify(`grid is ${GRID_WIDTH} tiles wide`);
  snapAllToGrid();
  return GRID_WIDTH;
}

changeGridHeight = n => {
  GRID_HEIGHT = Math.max(1, GRID_HEIGHT + n);
  Phoenix.notify(`grid is ${GRID_HEIGHT} tiles high`);
  snapAllToGrid();
  return GRID_HEIGHT;
}

Window.prototype.getBoxSize = function(screen) {
  let frame = this.screenFrame(screen);
  return [frame.width / GRID_WIDTH, frame.height / GRID_HEIGHT];
}

Window.prototype.getGrid = function() {
  let [boxWidth, boxHeight] = this.getBoxSize();
  let frame = this.frame();
  let screenFrame = this.screenFrame();
  let grid = {
    x: Math.round((frame.x - screenFrame.x) / boxWidth),
    y: Math.round((frame.y - screenFrame.y) / boxHeight),
    width: Math.max(1, Math.round(frame.width / boxWidth)),
    height: Math.max(1, Math.round(frame.height / boxHeight))
  };
  return grid;
}

Window.prototype.setGrid = function({y, x, width, height}, screen) {
  let [boxWidth, boxHeight] = this.getBoxSize(screen);
  let screenFrame = this.screenFrame(screen);
  let frame = {
    x: (x * boxWidth) + screenFrame.x + MARGIN_X,
    y: (y * boxHeight) + screenFrame.y + MARGIN_Y,
    width: (width * boxWidth) - (MARGIN_X * 2.0),
    height: (height * boxHeight) - (MARGIN_Y * 2.0)
  };
  return this.setFrame(frame);
}

Window.prototype.snapToGrid = function() {
  if (this.isNormal()) {
    return this.setGrid(this.getGrid());
  }
}

Window.prototype.calculateGrid = function({x, y, width, height}) {
  return {
    y: Math.round(y * this.screenFrame().height) + MARGIN_Y + this.screenFrame().y,
    x: Math.round(x * this.screenFrame().width) + MARGIN_X + this.screenFrame().x,
    width: Math.round(width * this.screenFrame().width) - 2.0 * MARGIN_X,
    height: Math.round(height * this.screenFrame().height) - 2.0 * MARGIN_Y
  };
}

Window.prototype.proportionWidth = function() {
  let s_w, w_w;
  s_w = this.screenFrame().width;
  w_w = this.frame().width;
  return Math.round((w_w / s_w) * 100) / 100;
}

Window.prototype.toGrid = function({x, y, width, height}) {
  let rect = this.calculateGrid({x, y, width, height});
  return this.setFrame(rect);
}

Window.prototype.topRight = function() {
  return {
    x: this.frame().x + this.frame().width,
    y: this.frame().y
  };
}

Window.prototype.toLeft = function() {
  return _.filter(this.neighbors('west'), function(win) {
    return win.topLeft().x < this.topLeft().x - 10
  });
}

Window.prototype.toRight = function() {
  return _.filter(this.neighbors('east'), function(win) {
    return win.topRight().x > this.topRight().x + 10
  });
}

Window.prototype.info = function() {
  let f = this.frame();
  return `[${this.app().processIdentifier()}] ${this.app().name()} : ${this.title()}\n{x:${f.x}, y:${f.y}, width:${f.width}, height:${f.height}}\n`;
}

lastFrames = {};

Window.prototype.toFullScreen = function(toggle = true) {
  if (!_.isEqual(this.frame(), this.fullGridFrame())) {
    this.rememberFrame();
    return this.toGrid({y: 0, x: 0, width: 1, height: 1});
  } else if (toggle && lastFrames[this.uid()]) {
    this.setFrame(lastFrames[this.uid()]);
    return this.forgetFrame();
  }
}

Window.prototype.uid = function() {
  return `${this.app().name()}::${this.title()}`;
}

Window.prototype.rememberFrame = function() {
  return lastFrames[this.uid()] = this.frame();
}

Window.prototype.forgetFrame = function() {
  return delete lastFrames[this.uid()];
}

Window.prototype.togglingWidth = function() {
  switch (this.proportionWidth()) {
    case 0.75:
      return 0.5;
    case 0.5:
      return 0.25;
    default:
      return 0.75;
  }
}

Window.prototype.toTopHalf = function() {
  return this.toGrid({x: 0, y: 0, width: 1, height: 0.5});
}

Window.prototype.toBottomHalf = function() {
  return this.toGrid({x: 0, y: 0.5, width: 1, height: 0.5});
}

Window.prototype.toLeftHalf = function() {
  return this.toGrid({x: 0, y: 0, width: 0.5, height: 1});
}

Window.prototype.toRightHalf = function() {
  return this.toGrid({x: 0.5, y: 0, width: 0.5, height: 1});
}

Window.prototype.toLeftToggle = function() {
  return this.toGrid({
    x: 0,
    y: 0,
    width: this.togglingWidth(),
    height: 1
  });
}

Window.prototype.toRightToggle = function() {
  let newWidth = this.togglingWidth();
  return this.toGrid({
    x: 1 - newWidth,
    y: 0,
    width: newWidth,
    height: 1
  });
}

Window.prototype.toCenterWithBorder = function(border = 1) {
  let [boxWidth, boxHeight] = this.getBoxSize();
  let rect = { 
               x: border,
               y: border, 
               width: GRID_WIDTH - (border * 2), 
               height: GRID_HEIGHT - (border * 2) 
             };
  this.setGrid(rect);
}

Window.prototype.toTopRight = function() {
  return this.toGrid({x: 0.5, y: 0, width: 0.5, height: 0.5});
}

Window.prototype.toBottomRight = function() {
  return this.toGrid({x: 0.5, y: 0.5, width: 0.5, height: 0.5});
}

Window.prototype.toTopLeft = function() {
  return this.toGrid({x: 0, y: 0, width: 0.5, height: 0.5});
}

Window.prototype.toBottomLeft = function() {
  return this.toGrid({x: 0, y: 0.5, width: 0.5, height: 0.5});
}

Window.prototype.toTopRightThird = function() {
  return this.toGrid({x: (2.0 / 3.0), y: 0, width: (1.0 / 3.0), height: 0.5});
}

Window.prototype.toBottomRightThird = function() {
  return this.toGrid({x: (2.0 / 3.0), y: 0.5, width: (1.0 / 3.0), height: 0.5});
}

Window.prototype.toTopMiddleThird = function() {
  return this.toGrid({x: (1.0 / 3.0), y: 0, width: (1.0 / 3.0), height: 0.5});
}

Window.prototype.toBottomMiddleThird = function() {
  return this.toGrid({x: (1.0 / 3.0), y: 0.5, width: (1.0 / 3.0), height: 0.5});
}

Window.prototype.toTopLeftThird = function() {
  return this.toGrid({x: 0, y: 0, width: (1.0 / 3.0), height: 0.5});
}

Window.prototype.toBottomLeftThird = function() {
  return this.toGrid({x: 0, y: 0.5, width: (1.0 / 3.0), height: 0.5});
}

Window.prototype.toLeftTwoThirds = function() {
  return this.toGrid({x: 0, y: 0, width: (2.0 / 3.0), height: 1});
}

Window.prototype.toRightTwoThirds = function() {
  return this.toGrid({x: (1.0 / 3.0), y: 0, width: (2.0 / 3.0), height: 1});
}

Window.prototype.toRightTopRight = function() {
  return this.toGrid({x: 0.75, y: 0, width: 0.25, height: 0.5});
}

Window.prototype.toRightBottomRight = function() {
  return this.toGrid({x: 0.75, y: 0.5, width: 0.25, height: 0.5});
}

Window.prototype.toRightTopLeft = function() {
  return this.toGrid({x: 0.5, y: 0, width: 0.25, height: 0.5});
}

Window.prototype.toRightBottomLeft = function() {
  return this.toGrid({x: 0.5, y: 0.5, width: 0.25, height: 0.5});
}

Window.prototype.toLeftTopRight = function() {
  return this.toGrid({x: 0.25, y: 0, width: 0.25, height: 0.5});
}

Window.prototype.toLeftBottomRight = function() {
  return this.toGrid({x: 0.25, y: 0.5, width: 0.25, height: 0.5});
}

Window.prototype.toLeftTopLeft = function() {
  return this.toGrid({x: 0, y: 0, width: 0.25, height: 0.5});
}

Window.prototype.toLeftBottomLeft = function() {
  return this.toGrid({x: 0, y: 0.5, width: 0.25, height: 0.5});
}

windowLeftOneColumn = () => {
  let frame = focused().getGrid();
  frame.x = Math.max(frame.x - 1, 0);
  return focused().setGrid(frame);
}

windowDownOneRow = () => {
  let frame = focused().getGrid();
  frame.y = Math.min(Math.floor(frame.y + 1), GRID_HEIGHT - 1);
  return focused().setGrid(frame);
}

windowUpOneRow = () => {
  let frame = focused().getGrid();
  frame.y = Math.max(Math.floor(frame.y - 1), 0);
  return focused().setGrid(frame);
}

windowRightOneColumn = () => {
  let frame = focused().getGrid();
  frame.x = Math.min(frame.x + 1, GRID_WIDTH - frame.width);
  return focused().setGrid(frame);
}

windowGrowOneGridColumn = () => {
  let frame = focused().getGrid();
  frame.width = Math.min(frame.width + 1, GRID_WIDTH - frame.x);
  return focused().setGrid(frame);
}

windowShrinkOneGridColumn = () => {
  let frame = focused().getGrid();
  frame.width = Math.max(frame.width - 1, 1);
  return focused().setGrid(frame);
}

windowGrowOneGridRow = () => {
  let frame = focused().getGrid();
  frame.height = Math.min(frame.height + 1, GRID_HEIGHT);
  return focused().setGrid(frame);
}

windowShrinkOneGridRow = () => {
  let frame = focused().getGrid();
  frame.height = Math.max(frame.height - 1, 1);
  return focused().setGrid(frame);
}

windowToFullHeight = () => {
  let frame = focused().getGrid();
  frame.y = 0;
  frame.height = GRID_HEIGHT;
  return focused().setGrid(frame);
}

windowToFullWidth = () => {
  let frame = focused().getGrid();
  frame.x = 0;
  frame.width = GRID_WIDTH;
  return focused().setGrid(frame);
}

moveWindowToNextScreen = () => focused().setGrid(focused().getGrid(), focused().screen().next());

moveWindowToPreviousScreen = () => focused().setGrid(focused().getGrid(), focused().screen().previous());

App.prototype.firstWindow = function() {
  return this.all({
    visible: true
  })[0];
}

App.allWithName = name => _.filter(App.all(), a => a.name() === name);

App.byName = name => {
  let app = _.first(App.allWithName(name));
  app.show();
  return app;
}

App.focusOrStart = name => {
  return App.launch(name, { focus: true });
}

let showModal = (message, duration) => {
  let focus = focused();
  let frame = focus ? focus.screenFrame() : Screen.main().flippedVisibleFrame();
  let modal = Modal.build({
    duration: (duration != undefined) ? duration : 2,
    text: `${message}`
  });
  modal.origin = {
    x: (frame.width / 2) - modal.frame().width / 2,
    y: frame.height - 100
  };
  modal.show();
}

let showAppName = () => {
  let name = focused().app().name();
  showModal(`App: ${name}`);
}

let saveScreen = (tag) => {
  let focus = focused();
  let screen = (focus != undefined) ? focused().screen() : Screen.main();
  let windows = screen.windows({ visible: true });
  if (windows && (windows.length > 0)) {
    let savedWindows = [];
    for (i = 0; i < windows.length; i++) {
      let window = windows[i];
      savedWindows.push({appName: window.app().name(), frame: window.frame()});
    }
    Storage.set(tag, savedWindows);
    showModal(`Saved screen to ${tag}`, 5);
  }
}

let restoreScreen = (tag) => {
  let savedWindows = Storage.get(tag);
  if (savedWindows && (savedWindows.length > 0)) {
    for (i = 0; i < savedWindows.length; i++) {
      let window = savedWindows[i];
      let app = App.focusOrStart(window.appName);
      if (app) {
        Timer.after(1.0, () => {
          app.focus();
          let focus = focused();
          if (focus != undefined) focus.setFrame(window.frame);
        });
      }
    }
    showModal(`Restored screen from ${tag}`, 5);
  }
}

keys = [];
const bind_key = (key, description, modifier, fn) => keys.push(Key.on(key, modifier, fn));
const mash = 'alt-ctrl'.split('-');
const smash = 'alt-ctrl-shift'.split('-');
bind_key('right', 'To Next Screen', smash, moveWindowToNextScreen);
bind_key('left', 'To Previous Screen', smash, moveWindowToPreviousScreen);
bind_key('up', 'Top Half', mash, () => focused().toTopHalf());
bind_key('down', 'Bottom Half', mash, () => focused().toBottomHalf());
bind_key('left', 'Left Half', mash, () => focused().toLeftHalf());
bind_key('right', 'Right Half', mash, () => focused().toRightHalf());
bind_key('Z', 'Left Side Toggle', mash, () => focused().toLeftToggle());
bind_key('X', 'Right Side Toggle', mash, () => focused().toRightToggle());
bind_key('Q', 'Top Left', mash, () => focused().toTopLeft());
bind_key('W', 'Top Right', mash, () => focused().toTopRight());
bind_key('A', 'Bottom Left', mash, () => focused().toBottomLeft());
bind_key('S', 'Bottom Right', mash, () => focused().toBottomRight());
bind_key('E', 'Top Left Third', mash, () => focused().toTopLeftThird());
bind_key('R', 'Top Middle Third', mash, () => focused().toTopMiddleThird());
bind_key('T', 'Top Right Third', mash, () => focused().toTopRightThird());
bind_key('D', 'Bottom Left Third', mash, () => focused().toBottomLeftThird());
bind_key('F', 'Bottom Middle Third', mash, () => focused().toBottomMiddleThird());
bind_key('G', 'Bottom Right Third', mash, () => focused().toBottomRightThird());
bind_key('C', 'Left Two Thirds', mash, () => focused().toLeftTwoThirds());
bind_key('V', 'Center With Border', mash, () => focused().toCenterWithBorder(1));
bind_key('B', 'Right Two Thirds', mash, () => focused().toRightTwoThirds());
bind_key('return', 'Maximize Window', mash, () => focused().toFullScreen());
bind_key('space', 'Show App Name', mash, showAppName);
bind_key('Y', 'Left Top Left', mash, () => focused().toLeftTopLeft());
bind_key('U', 'Left Top Right', mash, () => focused().toLeftTopRight());
bind_key('H', 'Left Bottom Left', mash, () => focused().toLeftBottomLeft());
bind_key('J', 'Left Bottom Right', mash, () => focused().toLeftBottomRight());
bind_key('I', 'Right Top Left', mash, () => focused().toRightTopLeft());
bind_key('O', 'Right Top Right', mash, () => focused().toRightTopRight());
bind_key('K', 'Right Bottom Left', mash, () => focused().toRightBottomLeft());
bind_key('L', 'Right Bottom Right', mash, () => focused().toRightBottomRight());
bind_key(',', 'Move Grid Left', mash, windowLeftOneColumn);
bind_key('.', 'Move Grid Right', mash, windowRightOneColumn);
bind_key('N', 'Move Grid Up', mash, windowUpOneRow);
bind_key('M', 'Move Grid Down', mash, windowDownOneRow);
bind_key('P', 'Window Full Height', mash, windowToFullHeight);
bind_key(';', 'Window Full Width', mash, windowToFullWidth);
bind_key('-', 'Shrink by One Column', mash, windowShrinkOneGridColumn);
bind_key('=', 'Grow by One Column', mash, windowGrowOneGridColumn);
bind_key('[', 'Shrink by One Row', mash, windowShrinkOneGridRow);
bind_key(']', 'Grow by One Row', mash, windowGrowOneGridRow);
bind_key("'", 'Snap focused to grid', mash, () => focused().snapToGrid());
bind_key('\\', 'Snap all to grid', mash, function(){ visible().map(win => win.snapToGrid()) });
bind_key('1', 'Save screen layout 1', smash, () => saveScreen("Layout1"));
bind_key('1', 'Restore screen layout 1', mash, () => restoreScreen("Layout1"));
bind_key('2', 'Save screen layout 2', smash, () => saveScreen("Layout2"));
bind_key('2', 'Restore screen layout 2', mash, () => restoreScreen("Layout2"));
bind_key('3', 'Save screen layout 3', smash, () => saveScreen("Layout3"));
bind_key('3', 'Restore screen layout 3', mash, () => restoreScreen("Layout3"));
bind_key('4', 'Save screen layout 4', smash, () => saveScreen("Layout4"));
bind_key('4', 'Restore screen layout 4', mash, () => restoreScreen("Layout4"));
bind_key('5', 'Save screen layout 5', smash, () => saveScreen("Layout5"));
bind_key('5', 'Restore screen layout 5', mash, () => restoreScreen("Layout5"));
bind_key('6', 'Save screen layout 6', smash, () => saveScreen("Layout6"));
bind_key('6', 'Restore screen layout 6', mash, () => restoreScreen("Layout6"));
bind_key('7', 'Save screen layout 7', smash, () => saveScreen("Layout7"));
bind_key('7', 'Restore screen layout 7', mash, () => restoreScreen("Layout7"));
bind_key('8', 'Save screen layout 8', smash, () => saveScreen("Layout8"));
bind_key('8', 'Restore screen layout 8', mash, () => restoreScreen("Layout8"));
bind_key('9', 'Save screen layout 9', smash, () => saveScreen("Layout9"));
bind_key('9', 'Restore screen layout 9', mash, () => restoreScreen("Layout9"));
bind_key('0', 'Save screen layout 0', smash, () => saveScreen("Layout0"));
bind_key('0', 'Restore screen layout 0', mash, () => restoreScreen("Layout0"));

Phoenix.notify("All ok.")
