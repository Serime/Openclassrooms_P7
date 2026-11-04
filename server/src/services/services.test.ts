import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contactService } from './contactService';
import { organizationService } from './organizationService';
import { contactRepository } from '../repositories/contactRepository';
import { organizationRepository } from '../repositories/organizationRepository';

vi.mock('../repositories/contactRepository', () => ({
  contactRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
  },
}));

vi.mock('../repositories/organizationRepository', () => ({
  organizationRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
  },
}));

interface ServiceCase {
  name: string;
  notFound: string;
  repository: Record<'findAll' | 'findById' | 'create' | 'update' | 'delete' | 'getStats', ReturnType<typeof vi.fn>>;
  getAll: () => Promise<unknown>;
  getById: (id: string) => Promise<unknown>;
  create: (data: never) => Promise<unknown>;
  update: (id: string, data: never) => Promise<unknown>;
  remove: (id: string) => Promise<void>;
  stats: () => Promise<unknown>;
  sample: Record<string, unknown>;
}

const cases: ServiceCase[] = [
  {
    name: 'contactService',
    notFound: 'Contact not found',
    repository: contactRepository as unknown as ServiceCase['repository'],
    getAll: () => contactService.getAllContacts(),
    getById: (id) => contactService.getContactById(id),
    create: (data) => contactService.createContact(data),
    update: (id, data) => contactService.updateContact(id, data),
    remove: (id) => contactService.deleteContact(id),
    stats: () => contactService.getContactStats(),
    sample: { firstName: 'Maria', lastName: 'Durand', email: 'maria@example.org' },
  },
  {
    name: 'organizationService',
    notFound: 'Organization not found',
    repository: organizationRepository as unknown as ServiceCase['repository'],
    getAll: () => organizationService.getAllOrganizations(),
    getById: (id) => organizationService.getOrganizationById(id),
    create: (data) => organizationService.createOrganization(data),
    update: (id, data) => organizationService.updateOrganization(id, data),
    remove: (id) => organizationService.deleteOrganization(id),
    stats: () => organizationService.getOrganizationStats(),
    sample: { name: 'Isotope SA' },
  },
];

describe.each(cases)('$name', (service) => {
  const existing = { id: 'id-1', ...service.sample };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns every record from the repository', async () => {
    service.repository.findAll.mockResolvedValue([existing]);

    await expect(service.getAll()).resolves.toEqual([existing]);
  });

  it('returns a record by id', async () => {
    service.repository.findById.mockResolvedValue(existing);

    await expect(service.getById('id-1')).resolves.toEqual(existing);
  });

  it('throws a not found error for an unknown id', async () => {
    service.repository.findById.mockResolvedValue(null);

    await expect(service.getById('missing')).rejects.toThrow(service.notFound);
  });

  it('creates a record', async () => {
    service.repository.create.mockResolvedValue(existing);

    await expect(service.create(service.sample as never)).resolves.toEqual(existing);
    expect(service.repository.create).toHaveBeenCalledWith(service.sample);
  });

  it('updates an existing record', async () => {
    service.repository.findById.mockResolvedValue(existing);
    service.repository.update.mockResolvedValue(existing);

    await service.update('id-1', service.sample as never);

    expect(service.repository.update).toHaveBeenCalledWith('id-1', service.sample);
  });

  it('never updates or deletes an unknown record', async () => {
    service.repository.findById.mockResolvedValue(null);

    await expect(service.update('missing', service.sample as never)).rejects.toThrow(service.notFound);
    await expect(service.remove('missing')).rejects.toThrow(service.notFound);
    expect(service.repository.update).not.toHaveBeenCalled();
    expect(service.repository.delete).not.toHaveBeenCalled();
  });

  it('deletes an existing record', async () => {
    service.repository.findById.mockResolvedValue(existing);

    await service.remove('id-1');

    expect(service.repository.delete).toHaveBeenCalledWith('id-1');
  });

  it('returns the statistics', async () => {
    service.repository.getStats.mockResolvedValue({ total: 3 });

    await expect(service.stats()).resolves.toEqual({ total: 3 });
  });
});
