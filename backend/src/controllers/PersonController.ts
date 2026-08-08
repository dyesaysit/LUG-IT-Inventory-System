import type { CreatePersonInput, Person, PersonListQuery, UpdatePersonInput } from 'shared';
import type { IPersonService } from '../services/PersonService';
import { recordAudit } from '../services/audit-event';

/** HTTP-facing operations for the People module. */
export class PersonController {
  constructor(private readonly service: IPersonService) {}

  /** Lists personnel using validated query parameters. */
  list(query: PersonListQuery): Promise<Person[]> { return this.service.list(query); }

  /** Loads a single person. */
  getById(id: number): Promise<Person> { return this.service.getById(id); }

  /** Registers a person. */
  async create(input: CreatePersonInput): Promise<Person> { const row=await this.service.create(input);await recordAudit('PERSON',row.id,'CREATE',`Created person ${row.firstName} ${row.lastName}`,null,row);return row; }

  /** Applies a partial person update. */
  async update(id: number, input: UpdatePersonInput): Promise<Person> {
    const before=await this.service.getById(id);const row=await this.service.update(id,input);await recordAudit('PERSON',id,'UPDATE',`Updated person ${row.firstName} ${row.lastName}`,before,row);return row;
  }

  /** Soft-archives a person. */
  async archive(id: number): Promise<void> { const before=await this.service.getById(id);await this.service.archive(id);await recordAudit('PERSON',id,'ARCHIVE',`Archived person ${before.firstName} ${before.lastName}`,before); }
}
