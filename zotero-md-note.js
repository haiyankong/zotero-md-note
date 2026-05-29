ZoteroMDNote = {
  pluginID: "zotero-md-note@example.com",
  version: "0.1.8",
  rootURI: "",
  addedElementIDs: [],
  addedPopupListenerIDs: [],
  overwriteExisting: false,
  defaultBibliographyFormat: "bibliography=http://www.zotero.org/styles/apa",
  template: `# {{PAPER_TITLE}}

{{FULL_CITATION}}

- [Open Zotero item](zotero://select/library/items/{{ZOTERO_ITEM_KEY}})
{{ZOTERO_PDF_LINK}}

## Highlights

## Notes

## Quotes

## Points for Writing
`,

  init({ id, version, rootURI }) {
    this.pluginID = id || this.pluginID;
    this.version = version || this.version;
    this.rootURI = rootURI || this.rootURI;
  },

  cleanupLegacyMenus() {
    if (!Zotero.MenuManager) {
      return;
    }

    for (const menuID of ["zotero-md-note-library-item", "zotero-md-note-tools"]) {
      try {
        Zotero.MenuManager.unregisterMenu(menuID);
      } catch (e) {}
    }
  },

  addToWindow(win) {
    if (!win?.document) {
      return;
    }

    const doc = win.document;
    this.cleanupLegacyDom(win);

    this.addMenuItem(win, doc.getElementById("menu_ToolsPopup"), {
      id: "zotero-md-note-tools-menuitem",
      updateOnPopup: false,
    });
  },

  addMenuItem(win, popup, options) {
    if (!popup) {
      Zotero.debug(`zotero-md-note: Could not find menu popup for ${options.id}`);
      return;
    }

    const doc = win.document;
    const menuItem = doc.createXULElement("menuitem");
    menuItem.id = options.id;
    menuItem.setAttribute("label", "Create Markdown Note");
    menuItem.addEventListener("command", async () => {
      const result = await this.createNotesForItems(win, this.getSelectedItems());
      this.showResult(win, result);
    });

    if (options.updateOnPopup) {
      const listener = () => this.updateMenuItemState(menuItem);
      popup.addEventListener("popupshowing", listener);
      this.addedPopupListenerIDs.push({ win, popupID: popup.id, listener });
      listener();
    }

    const anchor = options.beforeSelector ? popup.querySelector(options.beforeSelector) : null;
    if (anchor) {
      popup.insertBefore(menuItem, anchor);
    } else {
      popup.appendChild(menuItem);
    }

    this.addedElementIDs.push({ win, id: menuItem.id });
  },

  updateMenuItemState(menuItem) {
    const hasCandidates = this.getSelectedItems().some((item) => this.isCandidateItem(item));
    menuItem.hidden = !hasCandidates;
    menuItem.disabled = !hasCandidates;
  },

  addToAllWindows() {
    for (const win of Zotero.getMainWindows()) {
      if (win.ZoteroPane) {
        this.addToWindow(win);
      }
    }
  },

  removeFromWindow(win) {
    if (!win?.document) {
      return;
    }

    for (const entry of this.addedPopupListenerIDs.filter((entry) => entry.win === win)) {
      const popup = win.document.getElementById(entry.popupID);
      popup?.removeEventListener("popupshowing", entry.listener);
    }
    this.addedPopupListenerIDs = this.addedPopupListenerIDs.filter((entry) => entry.win !== win);

    for (const entry of this.addedElementIDs.filter((entry) => entry.win === win)) {
      win.document.getElementById(entry.id)?.remove();
    }
    this.addedElementIDs = this.addedElementIDs.filter((entry) => entry.win !== win);
  },

  removeFromAllWindows() {
    for (const win of Zotero.getMainWindows()) {
      this.removeFromWindow(win);
    }
  },

  cleanupLegacyDom(win) {
    if (!win?.document) {
      return;
    }

    for (const id of ["zotero-md-note-item-menuitem", "zotero-md-note-tools-menuitem"]) {
      win.document.getElementById(id)?.remove();
    }
  },

  getWindow(event) {
    return event?.target?.ownerGlobal
      || Zotero.getMainWindow?.()
      || Zotero.getActiveZoteroPane?.()?.document?.defaultView
      || null;
  },

  getSelectedItems() {
    try {
      return Zotero.getActiveZoteroPane().getSelectedItems();
    } catch (e) {
      return [];
    }
  },

  getItemsFromContext(context) {
    return context?.items?.length ? context.items : this.getSelectedItems();
  },

  isCandidateItem(item) {
    return !!item && (
      (item.isRegularItem && item.isRegularItem())
      || (item.isAttachment && item.isAttachment())
    );
  },

  alert(win, title, message) {
    try {
      Services.prompt.alert(win, title, message);
    } catch (e) {
      try {
        win.alert(`${title}\n\n${message}`);
      } catch (e2) {
        Zotero.debug(`${title}: ${message}`);
      }
    }
  },

  showProgress(message) {
    try {
      const progressWindow = new Zotero.ProgressWindow();
      progressWindow.changeHeadline("zotero-md-note");
      progressWindow.addDescription(message);
      progressWindow.show();
      progressWindow.startCloseTimer(3500);
    } catch (e) {
      Zotero.debug(`zotero-md-note: Could not show progress window: ${e}`);
    }
  },

  showResult(win, result) {
    if (result.ok) {
      this.showProgress(result.message);
      return;
    }

    this.alert(win, "zotero-md-note", result.message);
  },

  baseName(path) {
    return String(path || "").split(/[\\/]/).pop();
  },

  normalizeDir(path) {
    const normalized = String(path || "").trim();
    if (/^[A-Za-z]:[\\/]$/.test(normalized)) {
      return normalized;
    }
    return normalized.replace(/[\\/]+$/, "");
  },

  joinPath(dir, filename) {
    if (typeof PathUtils !== "undefined" && PathUtils.join) {
      return PathUtils.join(dir, filename);
    }

    const separator = dir.includes("\\") ? "\\" : "/";
    return `${dir.replace(/[\\/]+$/, "")}${separator}${filename}`;
  },

  async chooseNotesDir(win) {
    const { FilePicker } = ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs");
    const fp = new FilePicker();
    fp.init(win, "Select note saving folder", fp.modeGetFolder);
    fp.appendFilters(fp.filterAll);

    if (await fp.show() !== fp.returnOK) {
      return null;
    }

    return this.normalizeDir(fp.file && fp.file.path ? fp.file.path : fp.file);
  },

  stripExtension(filename) {
    return String(filename || "").replace(/\.[^.]+$/, "");
  },

  sanitizeFileName(filename) {
    return String(filename || "")
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  },

  async attachmentFilename(attachment) {
    if (attachment.attachmentFilename) {
      return attachment.attachmentFilename;
    }

    try {
      const filePath = await attachment.getFilePathAsync();
      return this.baseName(filePath);
    } catch (e) {
      return "";
    }
  },

  async isPdfAttachment(attachment) {
    if (!attachment || !attachment.isAttachment || !attachment.isAttachment()) {
      return false;
    }

    const contentType = String(attachment.attachmentContentType || "").toLowerCase();
    if (contentType === "application/pdf") {
      return true;
    }

    const filename = await this.attachmentFilename(attachment);
    return /\.pdf$/i.test(filename);
  },

  async findPdfAttachment(item) {
    if (typeof item.getBestAttachment === "function") {
      const bestAttachment = await item.getBestAttachment();
      if (await this.isPdfAttachment(bestAttachment)) {
        return bestAttachment;
      }
    }

    for (const attachmentID of item.getAttachments()) {
      const attachment = Zotero.Items.get(attachmentID);
      if (await this.isPdfAttachment(attachment)) {
        return attachment;
      }
    }

    return null;
  },

  async normalizeSelection(selectedItem) {
    let item = selectedItem;
    let pdfAttachment = null;

    if (selectedItem.isAttachment && selectedItem.isAttachment()) {
      if (await this.isPdfAttachment(selectedItem)) {
        pdfAttachment = selectedItem;
      }

      const parentID = selectedItem.parentItemID || selectedItem.parentID;
      if (parentID) {
        item = Zotero.Items.get(parentID);
      }
    }

    if (!item || !item.isRegularItem || !item.isRegularItem()) {
      return null;
    }

    if (!pdfAttachment) {
      pdfAttachment = await this.findPdfAttachment(item);
    }

    return { item, pdfAttachment };
  },

  yearPart(item) {
    const date = String(item.getField("date") || "");
    const match = date.match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/);
    return match ? match[0] : "no-year";
  },

  authorCreators(item) {
    let creators = [];
    try {
      creators = item.getCreators() || [];
    } catch (e) {
      return [];
    }

    const authors = creators.filter((creator) => {
      try {
        return Zotero.CreatorTypes.getName(creator.creatorTypeID) === "author";
      } catch (e) {
        return false;
      }
    });

    return authors.length ? authors : creators;
  },

  creatorFamilyName(creator) {
    return String(creator?.lastName || creator?.fieldMode && creator?.name || "").trim();
  },

  hyphenCase(text) {
    return String(text || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-")
      .toLowerCase();
  },

  truncateSlug(slug, maxLength) {
    const value = String(slug || "");
    if (value.length <= maxLength) {
      return value;
    }

    const hardCut = value.slice(0, maxLength).replace(/-+$/g, "");
    const lastHyphen = hardCut.lastIndexOf("-");

    if (lastHyphen > 0) {
      return hardCut.slice(0, lastHyphen).replace(/-+$/g, "");
    }

    return hardCut;
  },

  noteFileStem(item) {
    const year = this.yearPart(item);
    const creators = this.authorCreators(item);
    const firstFamily = this.hyphenCase(this.creatorFamilyName(creators[0]));
    const authorPart = firstFamily
      ? `${firstFamily}${creators.length > 2 ? "-et-al_" : "_"}`
      : "";
    const title = this.truncateSlug(this.hyphenCase(item.getField("title") || "untitled"), 50) || "untitled";

    return `${year}_${authorPart}${title}`;
  },

  zoteroLibraryPath(zoteroItem) {
    if (zoteroItem.libraryID === Zotero.Libraries.userLibraryID) {
      return "library";
    }

    try {
      const group = Zotero.Groups.getByLibraryID(zoteroItem.libraryID);
      if (group && group.id) {
        return `groups/${group.id}`;
      }
    } catch (e) {}

    return "library";
  },

  zoteroSelectURI(item) {
    return `zotero://select/${this.zoteroLibraryPath(item)}/items/${item.key}`;
  },

  zoteroOpenPdfURI(pdfAttachment) {
    return `zotero://open-pdf/${this.zoteroLibraryPath(pdfAttachment)}/items/${pdfAttachment.key}`;
  },

  getFullCitation(item) {
    let format = Zotero.Prefs.get("export.quickCopy.setting") || this.defaultBibliographyFormat;
    if (!String(format).startsWith("bibliography=")) {
      format = this.defaultBibliographyFormat;
    }

    const bibliography = Zotero.QuickCopy.getContentFromItems([item], format);
    return String(bibliography.text || "").trim();
  },

  fillTemplate(values) {
    let output = this.template;

    for (const [key, value] of Object.entries(values)) {
      output = output.split(`{{${key}}}`).join(value || "");
    }

    output = output.replace(
      `zotero://select/library/items/${values.ZOTERO_ITEM_KEY}`,
      values.ZOTERO_ITEM_URI
    );
    output = output.replace(
      `zotero://open-pdf/library/items/${values.ZOTERO_PDF_KEY}`,
      values.ZOTERO_PDF_URI
    );

    return output
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n";
  },

  async createNotesForItems(win, selectedItems) {
    if (!selectedItems.length) {
      return {
        ok: false,
        message: "Please select at least one Zotero item.",
      };
    }

    const notesDir = await this.chooseNotesDir(win);
    if (!notesDir) {
      return {
        ok: true,
        message: "Cancelled. No notes folder was selected.",
      };
    }

    const seenItemIDs = new Set();
    const results = [];

    for (const selectedItem of selectedItems) {
      try {
        const normalized = await this.normalizeSelection(selectedItem);
        if (!normalized) {
          results.push(`Skipped non-regular item: ${selectedItem.key}`);
          continue;
        }

        const { item, pdfAttachment } = normalized;
        if (seenItemIDs.has(item.id)) {
          continue;
        }
        seenItemIDs.add(item.id);

        const pdfFilename = pdfAttachment ? await this.attachmentFilename(pdfAttachment) : "";
        const noteStem = this.sanitizeFileName(this.noteFileStem(item));
        const notePath = this.joinPath(notesDir, `${noteStem}.md`);

        if (!this.overwriteExisting && await IOUtils.exists(notePath)) {
          results.push(`Already exists, skipped: ${notePath}`);
          continue;
        }

        const values = {
          PAPER_TITLE: item.getField("title") || noteStem,
          FULL_CITATION: this.getFullCitation(item),
          PDF_FILENAME: pdfFilename,
          PDF_FILENAME_WITHOUT_EXTENSION: pdfFilename ? this.stripExtension(pdfFilename) : "",
          ZOTERO_ITEM_KEY: item.key,
          ZOTERO_PDF_KEY: pdfAttachment ? pdfAttachment.key : "",
          ZOTERO_ITEM_URI: this.zoteroSelectURI(item),
          ZOTERO_PDF_URI: pdfAttachment ? this.zoteroOpenPdfURI(pdfAttachment) : "",
          ZOTERO_PDF_LINK: pdfAttachment
            ? `- [Open Zotero PDF](${this.zoteroOpenPdfURI(pdfAttachment)})`
            : "",
        };

        const markdown = this.fillTemplate(values);
        await Zotero.File.putContentsAsync(notePath, markdown);
        results.push(`Created: ${notePath}`);
      } catch (e) {
        results.push(`Error: ${e.message || e}`);
      }
    }

    const hasErrors = results.some((line) => line.startsWith("Error:"));
    return {
      ok: !hasErrors,
      message: results.join("\n"),
    };
  },
};
