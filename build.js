// Apex build: src/styles.css -> minified + inlined into every HTML <style id="apex-css"> (also written to assets/css/styles.css),
// src/main.js -> minified assets/js/main.js with ?v= cache-bust. Edit src/, then: npm i --no-save csso terser && node build.js
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const root = __dirname;
const csso = require("csso"), { minify } = require("terser");
(async () => {
  const css = csso.minify(fs.readFileSync(path.join(root, "src/styles.css"), "utf8")).css;
  fs.writeFileSync(path.join(root, "assets/css/styles.css"), css);
  const js = (await minify(fs.readFileSync(path.join(root, "src/main.js"), "utf8"), { compress: true, mangle: true })).code;
  fs.writeFileSync(path.join(root, "assets/js/main.js"), js);
  const h = (s) => crypto.createHash("md5").update(s).digest("hex").slice(0, 8);
  const vc = h(css), vj = h(js);
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (["node_modules", "src", "assets"].includes(e.name) ? [] : walk(path.join(d, e.name))) : e.name.endsWith(".html") ? [path.join(d, e.name)] : []);
  for (const f of walk(root)) {
    let s = fs.readFileSync(f, "utf8");
    // Inline the minified CSS (removes the render-blocking request). Fonts use root-relative URLs.
    const inline = '<style id="apex-css">' + css.replace(/url\(\.\.\/fonts\//g, "url(/assets/fonts/") + "</style>";
    s = s.replace(/<link rel="stylesheet" href="[^"]*assets\/css\/styles\.css[^"]*">|<style id="apex-css">[\s\S]*?<\/style>/, () => inline);
    s = s.replace(/(assets\/js\/main\.js)(\?v=\w+)?/g, `$1?v=${vj}`);
    fs.writeFileSync(f, s);
  }
  console.log("css", css.length, "js", js.length, "v", vc, vj);
})();
