# Borehole reference — PDF build

Single-source generator for the borehole/well evaluation reference. Authors the
content once and renders three outputs: branded PDF (Kayd Solutions), unbranded
PDF, and a Markdown source.

## Rebuild
```bash
npm install pdfmake@0.3.11
node generate.js <output-dir>     # e.g. node generate.js ..
```
Outputs:
- `Borehole-Well-Evaluation-Reference_Kayd-Solutions.pdf`
- `Borehole-Well-Evaluation-Reference.pdf`
- `borehole-well-evaluation-reference.md`

To edit content, change the `DOC` array in `generate.js` (one source → all three
outputs). Uses the built-in standard PDF fonts (no font files needed) and no
headless browser.
