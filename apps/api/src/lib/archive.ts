import fs from "fs";
import path from "path";
import archiver from "archiver";

export async function zipDirectory(sourceDir: string, outFile: string): Promise<string> {
  await fs.promises.mkdir(path.dirname(outFile), { recursive: true });

  return new Promise<string>((resolve, reject) => {
    const output = fs.createWriteStream(outFile);
    const archive = archiver("zip", {
      zlib: { level: 9 }
    });

    output.on("close", () => resolve(outFile));
    archive.on("error", (error: Error) => reject(error));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize().catch(reject);
  });
}
