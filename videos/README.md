Drop animation video files here (`.mp4` recommended — universally supported; `.webm` also works).

After adding a file, add an entry for it in the `CLIPS` array near the top of `/animation.js`:

```js
{ src: '../videos/yourfile.mp4', title: 'Your Clip Title' }
```

That's the only place clips need to be registered — the animation page reads from that list.
