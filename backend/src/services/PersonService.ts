import {
  CreatePersonInputSchema,
  PersonListQuerySchema,
  UpdatePersonInputSchema,
} from 'shared';
import type { CreatePersonInput, Person, PersonListQuery, UpdatePersonInput } from 'shared';
import { AppError } from '../middleware/errorHandler';
import type { IPersonRepository } from '../repositories/PersonRepository';

const cleanOptional = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined || value === null) return value;
  return value.trim() || null;
};

/** Business operations exposed by the People module. */
export interface IPersonService {
  list(query: PersonListQuery): Promise<Person[]>;
  getById(id: number): Promise<Person>;
  create(input: CreatePersonInput): Promise<Person>;
  update(id: number, input: UpdatePersonInput): Promise<Person>;
  archive(id: number): Promise<void>;
}

/** Validation and business rules for personnel records. */
export class PersonService implements IPersonService {
  constructor(private readonly repository: IPersonRepository) {}

  async list(query: PersonListQuery): Promise<Person[]> {
    return this.repository.list(PersonListQuerySchema.parse(query));
  }

  async getById(id: number): Promise<Person> {
    const person = await this.repository.getById(id);
    if (!person) throw new AppError('Person not found', 404);
    return person;
  }

  async create(input: CreatePersonInput): Promise<Person> {
    const parsed = CreatePersonInputSchema.parse(input);
    const normalized: CreatePersonInput = {
      ...parsed,
      staffId: parsed.staffId.trim().toUpperCase(),
      firstName: parsed.firstName.trim(),
      lastName: parsed.lastName.trim(),
      email: cleanOptional(parsed.email)?.toLowerCase() ?? null,
      phone: cleanOptional(parsed.phone),
      jobTitle: cleanOptional(parsed.jobTitle),
      notes: cleanOptional(parsed.notes),
    };
    await this.validateReferencesAndDuplicates(normalized);
    return this.repository.create(normalized);
  }

  async update(id: number, input: UpdatePersonInput): Promise<Person> {
    await this.getById(id);
    const parsed = UpdatePersonInputSchema.parse(input);
    if (Object.keys(parsed).length === 0) throw new AppError('At least one usable field is required', 400);
    const normalized: UpdatePersonInput = { ...parsed };
    if (parsed.staffId !== undefined) normalized.staffId = parsed.staffId.trim().toUpperCase();
    if (parsed.firstName !== undefined) normalized.firstName = parsed.firstName.trim();
    if (parsed.lastName !== undefined) normalized.lastName = parsed.lastName.trim();
    for (const key of ['email', 'phone', 'jobTitle', 'notes'] as const) {
      if (parsed[key] !== undefined) normalized[key] = cleanOptional(parsed[key]);
    }
    if (normalized.email) normalized.email = normalized.email.toLowerCase();
    await this.validateReferencesAndDuplicates(normalized, id);
    return this.repository.update(id, normalized);
  }

  async archive(id: number): Promise<void> {
    await this.getById(id);
    await this.repository.archive(id);
  }

  private async validateReferencesAndDuplicates(
    input: CreatePersonInput | UpdatePersonInput,
    excludeId?: number,
  ): Promise<void> {
    if (input.staffId && await this.repository.hasStaffId(input.staffId, excludeId)) {
      throw new AppError('Staff ID already exists', 409);
    }
    if (input.email && await this.repository.hasEmail(input.email, excludeId)) {
      throw new AppError('Email already exists', 409);
    }
    if (input.departmentId !== undefined && input.departmentId !== null
      && !await this.repository.departmentExists(input.departmentId)) {
      throw new AppError('Department not found', 400);
    }
  }
}
