import { AuditRepository } from "./audit.repository";

export class AuditService {
  constructor(private readonly repository = new AuditRepository()) {}
  async log(userId: string, action: string, resourceType: string, resourceId: string, details?: string) {
    return this.repository.create(userId, action, resourceType, resourceId, details);
  }

  async findByResource(resourceType: string, resourceId: string) {
    return this.repository.findByResource(resourceType, resourceId);
  }

  async findByUser(userId: string) {
    return this.repository.findByUser(userId);
  }
}
