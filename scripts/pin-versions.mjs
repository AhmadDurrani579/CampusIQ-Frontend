import { readFile, writeFile } from 'node:fs/promises';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
for (const group of ['dependencies', 'devDependencies']) {
  for (const name of Object.keys(pkg[group])) {
    const version = lock.packages[`node_modules/${name}`]?.version;
    if (!version) throw new Error(`No installed version for ${name}`);
    pkg[group][name] = version;
    lock.packages[''][group][name] = version;
  }
}
await writeFile('package.json', JSON.stringify(pkg, null, 2) + '\n');
await writeFile('package-lock.json', JSON.stringify(lock, null, 2) + '\n');
console.log(JSON.stringify({ ...pkg.dependencies, ...pkg.devDependencies }));
