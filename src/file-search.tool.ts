import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class FileSearchTool {
  private readonly docsDir = path.resolve(process.cwd(), 'docs');

  @Tool({
    name: 'search-docs',
    description:
      'Search for documentation files by filename or content / Cari file dokumentasi berdasarkan nama atau konten',
    parameters: z.object({
      query: z.string().describe('Search query / Kata kunci pencarian'),
    }),
  })
  async searchDocs(input: { query: string }) {
    const files = await this.getFilesRecursively(this.docsDir);
    const results: { path: string; matchType: 'filename' | 'content' }[] = [];

    for (const file of files) {
      const relativePath = path.relative(this.docsDir, file);

      // Check filename
      if (relativePath.toLowerCase().includes(input.query.toLowerCase())) {
        results.push({ path: relativePath, matchType: 'filename' });
        continue;
      }

      // Check content
      try {
        const content = await fs.readFile(file, 'utf-8');
        if (content.toLowerCase().includes(input.query.toLowerCase())) {
          results.push({ path: relativePath, matchType: 'content' });
        }
      } catch {
        // Ignore read errors
      }
    }

    return JSON.stringify(results, null, 2);
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
