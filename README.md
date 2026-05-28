# zotero-md-note

A small Zotero plugin for creating one Markdown note per paper.

`zotero-md-note` creates a local `.md` note for the selected Zotero item. The note filename is based on the item's first PDF attachment filename, and the note includes links back to the Zotero item and Zotero PDF.

Repository: <https://github.com/haiyankong/zotero-md-note>

## Features

- Create a Markdown note from the currently selected Zotero item.
- Use the PDF attachment filename as the Markdown filename.
- Add a Zotero item link and a Zotero PDF link to the note.
- Ask for the note saving folder each time.
- Skip existing Markdown files by default.

## Compatibility

Tested with Zotero 9.0.4 on Windows.

## Install

1. Download `zotero-md-note.xpi` from the GitHub Releases page.
2. In Zotero, open `Tools -> Add-ons`.
3. Click the gear icon.
4. Choose `Install Add-on From File...`.
5. Select `zotero-md-note.xpi`.
6. Restart Zotero if Zotero asks you to.

## Use

1. Select one or more Zotero items.
2. Choose `Tools -> Create Markdown Note`.
3. Choose your note saving folder.

The plugin creates one Markdown file per selected Zotero item.

## Note Filename

The Markdown filename is based on the first PDF attachment filename:

```text
PDF filename without extension.md
```

For example:

```text
2026_guo-et-al_acute-stress-impacts-executive-social-function.md
```

## Generated Template

```md
# Paper Title

Full citation

- [Open Zotero item](zotero://select/library/items/ITEM_KEY)
- [Open Zotero PDF](zotero://open-pdf/library/items/PDF_KEY)

## Highlights

## Notes

## Quotes

## Points for Writing
```

## Behavior

- Existing `.md` files are not overwritten.
- If a selected item has no PDF attachment, the plugin reports an error for that item.
- The plugin does not modify Zotero items, PDFs, annotations, or notes.

## Development

This plugin uses the Zotero bootstrapped plugin format:

- `manifest.json`
- `bootstrap.js`
- `zotero-md-note.js`

To package the plugin, zip the contents of this directory and rename the archive to:

```text
zotero-md-note.xpi
```
