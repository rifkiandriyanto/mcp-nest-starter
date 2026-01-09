import { Injectable } from '@nestjs/common';
import { ResourceTemplate } from '@rekog/mcp-nest';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class DocsResource {
  private readonly docsDir = path.resolve(process.cwd(), 'docs');
  private readonly readmePath = path.resolve(process.cwd(), 'README.md');

  @ResourceTemplate({
    name: 'list-docs',
    uriTemplate: 'docs://list',
    description:
      'List all available documentation files / Tampilkan semua file dokumentasi yang tersedia',
    mimeType: 'application/json',
  })
  async listDocs() {
    const files = await this.getFilesRecursively(this.docsDir);
    const relativeFiles = files.map((f) => path.relative(this.docsDir, f));

    // Add README.md separately as it's outside docs folder
    relativeFiles.unshift('readme');

    return {
      uri: 'docs://list',
      mimeType: 'application/json',
      text: JSON.stringify(relativeFiles, null, 2),
    };
  }

  @ResourceTemplate({
    name: 'read-doc',
    uriTemplate: 'docs://{filepath}',
    description:
      'Read a documentation file. Use filepath from docs://list / Baca file dokumentasi. Gunakan filepath dari docs://list',
    mimeType: 'text/markdown',
  })
  async getDoc(params: { filepath: string }) {
    let filePath: string;
    const filename = params.filepath;

    if (filename === 'readme') {
      filePath = this.readmePath;
    } else {
      // Basic security check to prevent directory traversal
      if (filename.includes('..')) {
        throw new Error('Invalid filename: cannot contain ".."');
      }

      // Ensure extension is .md (optional, but good for safety if we only serve md)
      // But user might have other files, so let's check existence first.
      // If user provided path without extension, try adding .md
      const fullPath = path.join(this.docsDir, filename);

      // Check if file exists as is
      try {
        await fs.access(fullPath);
        filePath = fullPath;
      } catch {
        // Try with .md
        try {
          await fs.access(fullPath + '.md');
          filePath = fullPath + '.md';
        } catch {
          throw new Error(
            `Documentation file '${params.filepath}' not found / File dokumentasi tidak ditemukan`,
          );
        }
      }
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        uri: `docs://${params.filepath}`,
        mimeType: 'text/markdown',
        text: content,
      };
    } catch {
      throw new Error(
        `Error reading file '${params.filepath}' / Gagal membaca file`,
      );
    }
  }

  private async getFilesRecursively(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const res = path.resolve(dir, entry.name);
        return entry.isDirectory() ? this.getFilesRecursively(res) : [res];
      }),
    );
    return files.flat();
  }
}
