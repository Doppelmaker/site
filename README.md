# doppelmaker.app

The Doppelmaker website: plain HTML and one stylesheet, published by GitHub Pages from `main`
at the custom domain in `CNAME`. No build step, no external requests, cookies or analytics. The one
script is the home page's 3D viewer (three.js r160, self-hosted in `js/`, MIT, see
`js/three-LICENSE.txt`), loaded only when the visitor clicks it.

Images in `img/shots/` and `models/form.glb` come from the digital twin (a simulated subject run
through the real pipeline), rendered with three.js; they are not of a real person.

Pages are built from `pages/*.html` (content) by `build.py`, which adds the shared header and
footer. Edit the fragments in `pages/`, then run `python3 build.py`; commit both.

Fonts: Young Serif and Public Sans, self-hosted in `fonts/` (OFL, licence files alongside).

Preview locally:

```
python3 -m http.server 8000
```

then open http://localhost:8000/.
