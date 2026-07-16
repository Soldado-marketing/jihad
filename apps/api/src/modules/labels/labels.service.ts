import { Injectable } from '@nestjs/common';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { LabelsRepository } from './labels.repository';

@Injectable()
export class LabelsService {
  constructor(private readonly repo: LabelsRepository) {}

  listLabels(tenantId: string) {
    return this.repo.list(tenantId);
  }

  createLabel(tenantId: string, dto: CreateLabelDto) {
    return this.repo.create(tenantId, dto);
  }

  updateLabel(tenantId: string, id: string, dto: UpdateLabelDto) {
    return this.repo.update(tenantId, id, dto);
  }

  async deleteLabel(tenantId: string, id: string) {
    await this.repo.delete(tenantId, id);
  }

  assignLabel(tenantId: string, taskId: string, labelId: string) {
    return this.repo.assignLabel(tenantId, taskId, labelId);
  }

  async removeLabel(tenantId: string, taskId: string, labelId: string) {
    await this.repo.removeLabel(tenantId, taskId, labelId);
  }
}
