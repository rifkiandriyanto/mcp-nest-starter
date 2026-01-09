import { Injectable } from '@nestjs/common';
import { ResourceTemplate } from '@rekog/mcp-nest';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from './content.entity';

@Injectable()
export class ContentResource {
  constructor(
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
  ) {}

  @ResourceTemplate({
    name: 'content',
    uriTemplate: 'content://{id}',
    description: 'Get content by ID',
    mimeType: 'application/json',
  })
  async getContent(params: { id: string }) {
    const content = await this.contentRepository.findOneBy({
      id: parseInt(params.id),
    });

    if (!content) {
      throw new Error(`Content with ID ${params.id} not found`);
    }

    return {
      uri: `content://${params.id}`,
      mimeType: 'application/json',
      text: JSON.stringify(content, null, 2),
    };
  }
}
