import { copyFile, mkdir } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

const require = createRequire(import.meta.url)
const destination = new URL("../public/report-ocr/", import.meta.url)
await mkdir(destination, { recursive: true })

const workerDir = dirname(require.resolve("tesseract.js/package.json"))
const coreDir = dirname(require.resolve("tesseract.js-core/package.json"))
await Promise.all([
  copyFile(join(workerDir, "dist", "worker.min.js"), new URL("worker.min.js", destination)),
  copyFile(join(coreDir, "tesseract-core-lstm.wasm.js"), new URL("tesseract-core-lstm.wasm.js", destination)),
  ...["eng", "vie"].map(language => {
    const dataDir = dirname(require.resolve(`@tesseract.js-data/${language}/package.json`))
    const name = `${language}.traineddata.gz`
    return copyFile(join(dataDir, "4.0.0_best_int", name), new URL(name, destination))
  }),
])
