var ZoteroMDNote;

function install() {}

async function startup({ id, version, rootURI }) {
  Services.scriptloader.loadSubScript(rootURI + "zotero-md-note.js");
  ZoteroMDNote.init({ id, version, rootURI });
  ZoteroMDNote.cleanupLegacyMenus();
  ZoteroMDNote.addToAllWindows();
}

function onMainWindowLoad({ window }) {
  ZoteroMDNote.addToWindow(window);
}

function onMainWindowUnload({ window }) {
  ZoteroMDNote.removeFromWindow(window);
}

function shutdown() {
  ZoteroMDNote.cleanupLegacyMenus();
  ZoteroMDNote.removeFromAllWindows();
  ZoteroMDNote = undefined;
}

function uninstall() {}
