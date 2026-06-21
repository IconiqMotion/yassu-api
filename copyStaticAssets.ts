import * as shell from "shelljs";

// copy env folder to dist
shell.rm('-rf', 'dist/env'); // make sure old files deleted
shell.cp("-R", "src/env", "dist/env");
shell.cp("-R", "views", "dist/views");
// copy json files located under src to dist
shell.cp("-R", "src/*.json", "dist/");
// make sure upload folder exists
shell.mkdir("-p", "dist/public/uploads");
shell.mkdir("-p", "public/uploads");
